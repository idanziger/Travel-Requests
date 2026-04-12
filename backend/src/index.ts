import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getGoogleAuthUrl, getGoogleUser } from './auth';
import { query } from './db';
import { notifyNewRequest, notifyStatusChange } from './notifications';
import {
  debugGroupMembership,
  debugListGroupMembers,
  getUserRoleFromGroups,
  searchDirectoryUsers,
} from './google-groups';
import {
  clearSessionCookie,
  type AuthenticatedRequest,
  requireAdmin,
  requireAuth,
  requireSubmitter,
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

const schemaPath = path.join(__dirname, '../database_schema.sql');

type RequestDayInput = {
  day_index: number;
  day_date: string;
  morning_role: string;
  evening_role: string;
};

const approvalStatuses = [
  'Awaiting Response',
  'Need More Information',
  'Approved',
  'Not Approved',
];

const ensureSchema = async () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await query(sql);
};

const getRequestVisibilityClause = (user: NonNullable<AuthenticatedRequest['user']>) => {
  if (['admin', 'coordinator'].includes(user.role)) {
    return {
      sql: `SELECT r.*, 
              requester.name as requester_name,
              requester.email as requester_email,
              traveler.name as traveler_user_name
            FROM travel_requests r
            JOIN users requester ON r.requester_id = requester.id
            LEFT JOIN users traveler ON r.traveler_user_id = traveler.id
            ORDER BY r.submitted_at DESC`,
      params: [] as any[],
    };
  }

  return {
    sql: `SELECT r.*, 
            requester.name as requester_name,
            requester.email as requester_email,
            traveler.name as traveler_user_name
          FROM travel_requests r
          JOIN users requester ON r.requester_id = requester.id
          LEFT JOIN users traveler ON r.traveler_user_id = traveler.id
          WHERE r.requester_id = $1 OR lower(coalesce(r.traveler_email, '')) = $2
          ORDER BY r.submitted_at DESC`,
    params: [user.id, user.email.toLowerCase()],
  };
};

const buildRequestDays = (startDate: string, endDate: string, suppliedDays?: RequestDayInput[]) => {
  if (Array.isArray(suppliedDays) && suppliedDays.length > 0) {
    return suppliedDays.map((day, index) => ({
      day_index: index + 1,
      day_date: day.day_date,
      morning_role: day.morning_role,
      evening_role: day.evening_role,
    }));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: RequestDayInput[] = [];
  let current = new Date(start);
  let index = 1;

  while (current <= end) {
    days.push({
      day_index: index,
      day_date: current.toISOString().slice(0, 10),
      morning_role: '',
      evening_role: '',
    });
    current.setDate(current.getDate() + 1);
    index += 1;
  }

  return days;
};

const getOptionsPayload = async () => {
  const [optionRows, eventRows] = await Promise.all([
    query(
      `SELECT id, category, label, value, position, metadata
       FROM app_options
       WHERE is_active = true
       ORDER BY category ASC, position ASC, label ASC`
    ),
    query(
      `SELECT id, name, location, event_status, start_date, end_date
       FROM events
       WHERE is_active = true
       ORDER BY start_date NULLS LAST, name ASC`
    ),
  ]);

  const options = optionRows.rows.reduce((acc: Record<string, any[]>, row: any) => {
    if (!acc[row.category]) {
      acc[row.category] = [];
    }

    (acc[row.category] as any[]).push(row);
    return acc;
  }, {} as Record<string, any[]>);

  return {
    options,
    events: eventRows.rows,
    approvalStatuses,
  };
};

const hydrateRequests = async (rows: any[]) => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const dayResult = await query(
    `SELECT request_id, id, day_index, day_date, morning_role, evening_role
     FROM request_days
     WHERE request_id = ANY($1::int[])
     ORDER BY day_index ASC`,
    [ids]
  );

  const daysByRequest = dayResult.rows.reduce((acc: Record<number, any[]>, row: any) => {
    if (!acc[row.request_id]) {
      acc[row.request_id] = [];
    }

    (acc[row.request_id] as any[]).push(row);
    return acc;
  }, {} as Record<number, any[]>);

  return rows.map((row) => ({
    ...row,
    days: daysByRequest[row.id] || [],
  }));
};

const canActOnRequests = (user: NonNullable<AuthenticatedRequest['user']>) =>
  user.role === 'admin';

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/auth/google', (req, res) => {
  res.redirect(getGoogleAuthUrl());
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;

  try {
    const user = await getGoogleUser(code);
    if (!user?.email || !user.sub) {
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

    const name = user.name || user.email;
    const result = await query(
      `INSERT INTO users (google_id, email, name, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (google_id) DO UPDATE
       SET email = EXCLUDED.email,
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           role = EXCLUDED.role
       RETURNING id, email, name, role`,
      [user.sub, user.email, name, user.picture || null, role]
    );

    const dbUser = result.rows[0];
    setSessionCookie(
      res,
      signSessionToken({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      })
    );

    res.redirect(`${frontendUrl}/auth/callback`);
  } catch (error: any) {
    console.error('Detailed Login Error:', error.message || error);
    res.status(500).send(`Error logging in: ${error.message || 'Unknown error'}`);
  }
});

app.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

app.get('/api/config', requireAuth, async (req, res) => {
  try {
    res.json(await getOptionsPayload());
  } catch (error) {
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

app.get('/api/users/search', requireAuth, async (req: AuthenticatedRequest, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json([]);
  }

  try {
    const directoryResults = await searchDirectoryUsers(q);
    if (directoryResults.length > 0) {
      return res.json(directoryResults);
    }

    const localResults = await query(
      `SELECT email, name
       FROM users
       WHERE lower(email) LIKE $1 OR lower(name) LIKE $1
       ORDER BY name ASC
       LIMIT 20`,
      [`%${q.toLowerCase()}%`]
    );

    res.json(localResults.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, location, event_status, start_date, end_date, is_active
       FROM events
       ORDER BY start_date NULLS LAST, name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load events' });
  }
});

app.post('/api/events', requireAuth, requireAdmin, async (req, res) => {
  const { name, location, event_status, start_date, end_date } = req.body;

  try {
    const result = await query(
      `INSERT INTO events (name, location, event_status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, location, event_status, start_date || null, end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.patch('/api/events/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, location, event_status, start_date, end_date, is_active } = req.body;

  try {
    const result = await query(
      `UPDATE events
       SET name = $1,
           location = $2,
           event_status = $3,
           start_date = $4,
           end_date = $5,
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, location, event_status, start_date || null, end_date || null, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query(`UPDATE events SET is_active = false, updated_at = NOW() WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive event' });
  }
});

app.get('/api/options/:category', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, category, label, value, position, is_active, metadata
       FROM app_options
       WHERE category = $1
       ORDER BY position ASC, label ASC`,
      [req.params.category]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load options' });
  }
});

app.post('/api/options/:category', requireAuth, requireAdmin, async (req, res) => {
  const { label, value, position, metadata } = req.body;

  try {
    const result = await query(
      `INSERT INTO app_options (category, label, value, position, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [req.params.category, label, value || label, position || 999, JSON.stringify(metadata || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create option' });
  }
});

app.patch('/api/options/item/:id', requireAuth, requireAdmin, async (req, res) => {
  const { label, value, position, is_active, metadata } = req.body;

  try {
    const result = await query(
      `UPDATE app_options
       SET label = $1,
           value = $2,
           position = $3,
           is_active = COALESCE($4, is_active),
           metadata = $5::jsonb,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [label, value || label, position || 999, is_active, JSON.stringify(metadata || {}), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update option' });
  }
});

app.delete('/api/options/item/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query(`UPDATE app_options SET is_active = false, updated_at = NOW() WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive option' });
  }
});

app.post('/api/requests', requireAuth, requireSubmitter, async (req: AuthenticatedRequest, res) => {
  const {
    traveler_email,
    traveler_name,
    event_id,
    department,
    cost_center,
    budget,
    data_status,
    notes,
    start_date,
    end_date,
    days,
  } = req.body;

  try {
    const eventResult = await query(
      `SELECT id, name, location, event_status, start_date, end_date FROM events WHERE id = $1`,
      [event_id]
    );
    const event = eventResult.rows[0];
    if (!event) {
      return res.status(400).json({ error: 'Event not found' });
    }

    const travelerLookup = traveler_email
      ? await query(`SELECT id, name, email FROM users WHERE lower(email) = $1`, [
          String(traveler_email).toLowerCase(),
        ])
      : { rows: [] };

    const travelerUser = travelerLookup.rows[0] || null;
    const scheduleDays = buildRequestDays(start_date, end_date, days);

    const result = await query(
      `INSERT INTO travel_requests (
         requester_id, traveler_user_id, traveler_name, traveler_email, event_id, event_name,
         event_location, department, cost_center, budget, data_status, notes, start_date, end_date, total_days
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        req.user!.id,
        travelerUser?.id || null,
        traveler_name,
        traveler_email || null,
        event.id,
        event.name,
        event.location,
        department,
        cost_center,
        budget,
        data_status || 'waiting',
        notes || null,
        start_date,
        end_date,
        scheduleDays.length,
      ]
    );

    const newRequest = result.rows[0];

    await Promise.all(
      scheduleDays.map((day) =>
        query(
          `INSERT INTO request_days (request_id, day_index, day_date, morning_role, evening_role)
           VALUES ($1, $2, $3, $4, $5)`,
          [newRequest.id, day.day_index, day.day_date, day.morning_role || null, day.evening_role || null]
        )
      )
    );

    await notifyNewRequest({
      requesterName: req.user!.name,
      requesterEmail: req.user!.email,
      travelerName: traveler_name,
      travelerEmail: traveler_email || null,
      eventName: event.name,
    });

    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save request' });
  }
});

app.get('/api/requests', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const visibility = getRequestVisibilityClause(req.user!);
    const result = await query(visibility.sql, visibility.params);
    res.json(await hydrateRequests(result.rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.patch('/api/requests/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!canActOnRequests(req.user!)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { status, approver_notes } = req.body;

  try {
    const details = await query(
      `SELECT r.*, requester.email AS requester_email
       FROM travel_requests r
       JOIN users requester ON r.requester_id = requester.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (details.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const existing = details.rows[0];
    const finalStatus = status || existing.status;

    const result = await query(
      `UPDATE travel_requests
       SET status = $1,
           approver_notes = $2
       WHERE id = $3
       RETURNING *`,
      [finalStatus, approver_notes || null, req.params.id]
    );

    if (status) {
      await notifyStatusChange({
        requesterEmail: existing.requester_email,
        travelerEmail: existing.traveler_email,
        travelerName: existing.traveler_name,
        status: finalStatus,
        eventName: existing.event_name,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

app.get('/api/requests/:id/days', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requestResult = await query(
      `SELECT requester_id, traveler_email FROM travel_requests WHERE id = $1`,
      [req.params.id]
    );
    const row = requestResult.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (
      !['admin', 'coordinator'].includes(req.user!.role) &&
      row.requester_id !== req.user!.id &&
      String(row.traveler_email || '').toLowerCase() !== req.user!.email.toLowerCase()
    ) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT id, request_id, day_index, day_date, morning_role, evening_role
       FROM request_days
       WHERE request_id = $1
       ORDER BY day_index ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load request days' });
  }
});

app.patch('/api/requests/:id/days/:dayId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const requestResult = await query(
    `SELECT requester_id FROM travel_requests WHERE id = $1`,
    [req.params.id]
  );
  const requestRow = requestResult.rows[0];

  if (!requestRow) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (
    !['admin', 'coordinator'].includes(req.user!.role) &&
    requestRow.requester_id !== req.user!.id
  ) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const result = await query(
      `UPDATE request_days
       SET morning_role = $1,
           evening_role = $2
       WHERE id = $3 AND request_id = $4
       RETURNING *`,
      [req.body.morning_role || null, req.body.evening_role || null, req.params.dayId, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request day' });
  }
});

app.get('/api/debug/group-membership', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'email query param required' });
  }

  res.json(await debugGroupMembership(email));
});

app.get('/api/debug/group-members', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  const group = req.query.group as string;
  if (!group) {
    return res.status(400).json({ error: 'group query param required' });
  }

  res.json(await debugListGroupMembers(group));
});

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize schema', error);
    process.exit(1);
  });
