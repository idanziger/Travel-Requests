import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getGoogleAuthUrl, getGoogleUser } from './auth';
import { query } from './db';
import { notifyNewRequest, notifyStatusChange } from './notifications';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Health check (to make sure it's running)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 2. Route to start the login process
app.get('/auth/google', (req, res) => {
  const url = getGoogleAuthUrl();
  res.redirect(url);
});

// 3. Route where Google sends users back after login
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  try {
    const user = await getGoogleUser(code);
    if (!user) {
      return res.status(401).send('Authentication failed');
    }

    // Save the user to our database if they don't exist
    const { sub, email, name, picture } = user;
    console.log(`Successfully authenticated user: ${email}. Attempting to save to database...`);

    try {
      const result = await query(
        `INSERT INTO users (google_id, email, name, avatar_url) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (google_id) DO UPDATE 
         SET name = $3, avatar_url = $4
         RETURNING id, role`,
        [sub, email, name, picture]
      );
      
      const dbUser = result.rows[0];
      console.log('User saved successfully. ID:', dbUser.id);

      // Redirect back to the frontend (port 5173) and pass the user info in the URL
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

// 4. Route to save a new travel request
app.post('/api/requests', async (req, res) => {
  const { 
    requester_id, 
    traveler_name, 
    event_name, 
    department, 
    budget_code, 
    notes, 
    start_date, 
    end_date,
    requested_expenses
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO travel_requests 
       (requester_id, traveler_name, event_name, department, budget_code, notes, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [requester_id || 1, traveler_name, event_name, department, budget_code, notes, start_date, end_date]
    );

    const newRequest = result.rows[0];

    // Create sub-tasks only for selected expenses
    if (requested_expenses && requested_expenses.length > 0) {
      const taskValues = requested_expenses.map((task: string) => 
        `(${newRequest.id}, '${task}')`
      ).join(', ');
      
      await query(
        `INSERT INTO request_tasks (request_id, task_name) VALUES ${taskValues}`,
        []
      );
    }

    // Trigger Notification for New Request
    const managerResult = await query('SELECT name FROM users WHERE id = $1', [requester_id || 1]);
    const managerName = managerResult.rows[0]?.name || 'A Manager';
    notifyNewRequest(managerName, traveler_name, event_name);

    console.log('New travel request and dynamic checklist saved:', newRequest.id);
    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error('Error saving travel request:', error);
    res.status(500).json({ error: 'Failed to save request', details: error.message });
  }
});

// 5. Route to get travel requests (filtered by user or all for managers)
app.get('/api/requests', async (req, res) => {
  const userId = req.query.userId;
  
  try {
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRole = userResult.rows[0].role;
    let result;

    if (userRole === 'manager' || userRole === 'admin') {
      result = await query(`
        SELECT r.*, u.name as requester_name, u.email as requester_email 
        FROM travel_requests r 
        JOIN users u ON r.requester_id = u.id 
        ORDER BY r.request_date DESC
      `);
    } else {
      result = await query(
        'SELECT * FROM travel_requests WHERE requester_id = $1 ORDER BY request_date DESC',
        [userId]
      );
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// 6. Route to update a request's status (Manager only)
app.patch('/api/requests/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, managerId } = req.body;

  try {
    const managerCheck = await query('SELECT role FROM users WHERE id = $1', [managerId]);
    if (managerCheck.rows.length === 0 || managerCheck.rows[0].role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized: Only managers can update status' });
    }

    // Get the request details BEFORE updating so we can notify the requester
    const requestDetails = await query(`
      SELECT r.*, u.email as requester_email, u.name as requester_name 
      FROM travel_requests r 
      JOIN users u ON r.requester_id = u.id 
      WHERE r.id = $1
    `, [id]);

    if (requestDetails.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { requester_email, traveler_name } = requestDetails.rows[0];

    const result = await query(
      'UPDATE travel_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    // Trigger Notification for Status Change
    notifyStatusChange(requester_email, traveler_name, status);

    console.log(`Request ${id} status updated to: ${status}`);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 7. Route to get sub-tasks for a specific request
app.get('/api/requests/:id/tasks', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM request_tasks WHERE request_id = $1 ORDER BY id ASC', [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// 8. Route to update a sub-task's status
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await query(
      'UPDATE request_tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// 9. Route to add a NEW custom sub-task (expense)
app.post('/api/requests/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const { task_name } = req.body;
  try {
    const result = await query(
      'INSERT INTO request_tasks (request_id, task_name) VALUES ($1, $2) RETURNING *',
      [id, task_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding custom task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
