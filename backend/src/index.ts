import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getGoogleAuthUrl, getGoogleUser } from './auth';
import { query } from './db';
import { notifyNewRequest, notifyStatusChange } from './notifications';
import {
  debugGroupMembership,
  debugListGroupMembers,
  getUserRoleFromGroups,
} from './google-groups';
import {
  clearSessionCookie,
  type AuthenticatedRequest,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  signSessionToken,
} from './session';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedEmailDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'ssvlabs.io').toLowerCase();
const allowedOrigins = new Set(
  [frontendUrl, process.env.FRONTEND_URL_ALT, 'http://localhost:5173', 'http://127.0.0.1:5173']
    .filter(Boolean)
    .map((origin) => origin as string)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);
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

    const normalizedEmail = user.email.toLowerCase();
    const isAllowedDomain =
      normalizedEmail.endsWith(`@${allowedEmailDomain}`) &&
      (!user.hd || user.hd.toLowerCase() === allowedEmailDomain);

    if (!isAllowedDomain) {
      return res.status(403).send('Only SSV Labs Google Workspace accounts can access this app.');
    }

    const role = await getUserRoleFromGroups(user.email);
    if (!role) {
      return res.status(403).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #e11d48;">Access Denied</h1>
          <p>You do not have permission to access the Travel App.</p>
          <p>Please contact your admin to be added to the authorized Google Groups.</p>
          <a href="${frontendUrl}" style="color: #4f46e5; text-decoration: none;">Return Home</a>
        </div>
      `);
    }

    const { sub, email, picture } = user;
    const name = user.name || email;

    if (!sub) {
      return res.status(401).send('Authentication failed: Google user ID missing');
    }

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
      const sessionToken = signSessionToken({
        id: dbUser.id,
        email,
        name,
        role: dbUser.role,
      });

      setSessionCookie(res, sessionToken);

      const redirectUrl = `${frontendUrl}/auth/callback`;
      res.redirect(redirectUrl);

    } catch (dbError) {
      console.error('Database Error:', dbError);
      res.status(500).send('Database Error');
    }
  } catch (error: any) {
    console.error('Detailed Login Error:', error.message || error);
    res.status(500).send(`Error logging in: ${error.message || 'Unknown error'}`);
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

app.get('/api/debug/group-membership', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'email query param required' });
  }

  const result = await debugGroupMembership(email);
  res.json(result);
});

app.get('/api/debug/group-members', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  const group = req.query.group as string;
  if (!group) {
    return res.status(400).json({ error: 'group query param required' });
  }

  const result = await debugListGroupMembers(group);
  res.json(result);
});

app.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

// 4. Save Request
app.post('/api/requests', requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    traveler_name,
    event_name,
    department,
    budget_code,
    notes,
    start_date,
    end_date,
    requested_expenses,
  } = req.body;
  try {
    const result = await query(
      `INSERT INTO travel_requests (requester_id, traveler_name, event_name, department, budget_code, notes, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user!.id,
        traveler_name,
        event_name,
        department,
        budget_code,
        notes,
        start_date,
        end_date,
      ]
    );
    const newRequest = result.rows[0];
    if (requested_expenses && requested_expenses.length > 0) {
      await Promise.all(
        requested_expenses.map((task: string) =>
          query(
            'INSERT INTO request_tasks (request_id, task_name) VALUES ($1, $2)',
            [newRequest.id, task]
          )
        )
      );
    }
    await notifyNewRequest(req.user!.name, traveler_name, event_name);
    res.status(201).json(newRequest);
  } catch (error: any) { res.status(500).json({ error: 'Failed to save request' }); }
});

// 5. Get Requests
app.get('/api/requests', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    let result;
    if (req.user!.role === 'admin') {
      result = await query(`SELECT r.*, u.name as requester_name, u.email as requester_email FROM travel_requests r JOIN users u ON r.requester_id = u.id ORDER BY r.request_date DESC`);
    } else {
      result = await query(
        `SELECT * FROM travel_requests WHERE requester_id = $1 ORDER BY request_date DESC`,
        [req.user!.id]
      );
    }
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch requests' }); }
});

// 6. Update Status & Approver Notes
app.patch('/api/requests/:id/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, approver_notes } = req.body;
  try {
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
app.get('/api/requests/:id/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    if (req.user!.role !== 'admin') {
      const requestResult = await query('SELECT requester_id FROM travel_requests WHERE id = $1', [id]);
      if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      if (requestResult.rows[0].requester_id !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const result = await query('SELECT * FROM request_tasks WHERE request_id = $1 ORDER BY id ASC', [id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// 8. Update Task
app.patch('/api/tasks/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await query('UPDATE request_tasks SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// 9. New Task
app.post('/api/requests/:id/tasks', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { task_name } = req.body;
  try {
    const result = await query('INSERT INTO request_tasks (request_id, task_name) VALUES ($1, $2) RETURNING *', [id, task_name]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.listen(port, () => { console.log(`Server running on port ${port}`); });
