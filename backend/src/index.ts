import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getGoogleAuthUrl, getGoogleUser } from './auth';
import { query } from './db';
import { notifyNewRequest, notifyStatusChange } from './notifications';
import { getUserRoleFromGroups } from './google-groups';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 2. Start login
app.get('/auth/google', (req, res) => {
  const url = getGoogleAuthUrl();
  res.redirect(url);
});

// 3. Login callback with Group Check
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  try {
    const user = await getGoogleUser(code);
    if (!user || !user.email) {
      return res.status(401).send('Authentication failed');
    }

    const role = await getUserRoleFromGroups(user.email);
    if (!role) {
      return res.status(403).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #e11d48;">Access Denied</h1>
          <p>You do not have permission to access the Travel App.</p>
          <p>Please contact your admin to be added to the authorized Google Groups.</p>
          <a href="http://localhost:5173" style="color: #4f46e5; text-decoration: none;">Return Home</a>
        </div>
      `);
    }

    const { sub, email, name, picture } = user;
    console.log(`Authenticated: ${email} as ${role}. Saving...`);

    try {
      const result = await query(
        `INSERT INTO users (google_id, email, name, avatar_url, role) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (google_id) DO UPDATE 
         SET name = $3, avatar_url = $4, role = $5
         RETURNING id, role`,
        [sub, email, name, picture, role]
      );
      
      const dbUser = result.rows[0];
      const frontendUrl = `http://localhost:5173?userId=${dbUser.id}&userName=${encodeURIComponent(name)}&userRole=${dbUser.role}`;
      res.redirect(frontendUrl);

    } catch (dbError) {
      console.error('Database Error:', dbError);
      res.status(500).send('Database Error');
    }
  } catch (error: any) {
    console.error('Detailed Login Error:', error.message || error);
    res.status(500).send(`Error logging in: ${error.message || 'Unknown error'}`);
  }
});

// 4. Save Request
app.post('/api/requests', async (req, res) => {
  const { requester_id, traveler_name, event_name, department, budget_code, notes, start_date, end_date, requested_expenses } = req.body;
  try {
    const result = await query(
      `INSERT INTO travel_requests (requester_id, traveler_name, event_name, department, budget_code, notes, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [requester_id || 1, traveler_name, event_name, department, budget_code, notes, start_date, end_date]
    );
    const newRequest = result.rows[0];
    if (requested_expenses && requested_expenses.length > 0) {
      const taskValues = requested_expenses.map((task: string) => `(${newRequest.id}, '${task}')`).join(', ');
      await query(`INSERT INTO request_tasks (request_id, task_name) VALUES ${taskValues}`, []);
    }
    const managerResult = await query('SELECT name FROM users WHERE id = $1', [requester_id || 1]);
    notifyNewRequest(managerResult.rows[0]?.name || 'Manager', traveler_name, event_name);
    res.status(201).json(newRequest);
  } catch (error: any) { res.status(500).json({ error: 'Failed to save request' }); }
});

// 5. Get Requests
app.get('/api/requests', async (req, res) => {
  const userId = req.query.userId;
  try {
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userRole = userResult.rows[0].role;
    let result;
    if (userRole === 'manager' || userRole === 'admin') {
      result = await query(`SELECT r.*, u.name as requester_name, u.email as requester_email FROM travel_requests r JOIN users u ON r.requester_id = u.id ORDER BY r.request_date DESC`);
    } else {
      result = await query(`SELECT * FROM travel_requests WHERE requester_id = $1 ORDER BY request_date DESC`, [userId]);
    }
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch requests' }); }
});

// 6. Update Status & Approver Notes
app.patch('/api/requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, managerId, approver_notes } = req.body;
  try {
    const managerCheck = await query('SELECT role FROM users WHERE id = $1', [managerId]);
    if (managerCheck.rows.length === 0 || managerCheck.rows[0].role !== 'manager') return res.status(403).json({ error: 'Unauthorized' });
    
    const requestDetails = await query(`SELECT r.*, u.email as requester_email FROM travel_requests r JOIN users u ON r.requester_id = u.id WHERE r.id = $1`, [id]);
    if (requestDetails.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const result = await query(
      `UPDATE travel_requests SET status = $1, approver_notes = $2 WHERE id = $3 RETURNING *`, 
      [status || requestDetails.rows[0].status, approver_notes, id]
    );
    
    if (status) {
      notifyStatusChange(requestDetails.rows[0].requester_email, requestDetails.rows[0].traveler_name, status);
    }
    
    res.json(result.rows[0]);
  } catch (error: any) { 
    console.error('Error updating:', error);
    res.status(500).json({ error: 'Failed to update' }); 
  }
});

// 7. Get Tasks
app.get('/api/requests/:id/tasks', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM request_tasks WHERE request_id = $1 ORDER BY id ASC', [id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// 8. Update Task
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await query('UPDATE request_tasks SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// 9. New Task
app.post('/api/requests/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const { task_name } = req.body;
  try {
    const result = await query('INSERT INTO request_tasks (request_id, task_name) VALUES ($1, $2) RETURNING *', [id, task_name]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.listen(port, () => { console.log(`Server running on port ${port}`); });
