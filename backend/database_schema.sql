-- This file defines how our travel data is structured in the database.

-- 1. Users table: Stores anyone who logs into the app.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'employee' -- 'employee', 'manager', or 'admin'
);

-- 2. Travel Requests table: The main form data.
CREATE TABLE IF NOT EXISTS travel_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id), -- The person who filled the form
    traveler_name TEXT NOT NULL,               -- The person actually traveling
    event_name TEXT NOT NULL,
    department TEXT NOT NULL,
    budget_code TEXT NOT NULL,
    notes TEXT,
    request_date DATE DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Pending' -- 'Pending', 'Approved', 'Rejected', 'Need More Info'
);

-- 3. Sub-items: For things like "Morning Role" and "Evening Role" from your monday.com board.
CREATE TABLE IF NOT EXISTS request_tasks (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES travel_requests(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL, -- e.g., "Morning Role"
    status TEXT DEFAULT 'Not Started' -- 'Not Started', 'Done'
);
