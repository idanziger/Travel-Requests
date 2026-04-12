CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'employee'
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee';

CREATE TABLE IF NOT EXISTS app_options (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category, value)
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    event_status TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id),
    traveler_user_id INTEGER REFERENCES users(id),
    traveler_name TEXT NOT NULL,
    traveler_email TEXT,
    event_id INTEGER REFERENCES events(id),
    event_name TEXT NOT NULL,
    event_location TEXT,
    department TEXT,
    cost_center TEXT,
    budget TEXT,
    data_status TEXT,
    notes TEXT,
    approver_notes TEXT,
    request_date DATE DEFAULT CURRENT_DATE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER,
    status TEXT DEFAULT 'Awaiting Response'
);

ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS traveler_user_id INTEGER REFERENCES users(id);
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS traveler_email TEXT;
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS event_location TEXT;
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS data_status TEXT;
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS approver_notes TEXT;
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS total_days INTEGER;
ALTER TABLE travel_requests ALTER COLUMN status SET DEFAULT 'Awaiting Response';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'travel_requests' AND column_name = 'budget_code'
    ) THEN
        UPDATE travel_requests
        SET cost_center = COALESCE(cost_center, budget_code)
        WHERE budget_code IS NOT NULL;

        EXECUTE 'ALTER TABLE travel_requests ALTER COLUMN budget_code DROP NOT NULL';
    END IF;
END $$;

UPDATE travel_requests
SET status = CASE
    WHEN status = 'Pending' THEN 'Awaiting Response'
    WHEN status = 'Need More Info' THEN 'Need More Information'
    WHEN status = 'Rejected' THEN 'Not Approved'
    ELSE status
END
WHERE status IN ('Pending', 'Need More Info', 'Rejected');

CREATE TABLE IF NOT EXISTS request_days (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
    day_index INTEGER NOT NULL,
    day_date DATE NOT NULL,
    morning_role TEXT,
    evening_role TEXT,
    UNIQUE (request_id, day_index),
    UNIQUE (request_id, day_date)
);

CREATE TABLE IF NOT EXISTS request_tasks (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES travel_requests(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    status TEXT DEFAULT 'Not Started'
);

CREATE INDEX IF NOT EXISTS idx_travel_requests_requester_id ON travel_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_travel_requests_traveler_email ON travel_requests (traveler_email);
CREATE INDEX IF NOT EXISTS idx_request_days_request_id ON request_days (request_id);
CREATE INDEX IF NOT EXISTS idx_app_options_category ON app_options (category, position);

INSERT INTO app_options (category, label, value, position)
VALUES
    ('department', 'Biz Dev', 'Biz Dev', 1),
    ('department', 'Marketing', 'Marketing', 2),
    ('department', 'HR', 'HR', 3)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO app_options (category, label, value, position)
VALUES
    ('cost_center', 'Professional', 'Professional', 1),
    ('cost_center', 'HR Training', 'HR Training', 2),
    ('cost_center', 'HR Professional', 'HR Professional', 3)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO app_options (category, label, value, position)
VALUES
    ('budget', 'Professional', 'Professional', 1),
    ('budget', 'HR Training', 'HR Training', 2),
    ('budget', 'HR Professional', 'HR Professional', 3)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO app_options (category, label, value, position)
VALUES
    ('daily_role', 'No role', 'No role', 1),
    ('daily_role', 'Attend SSV side event', 'Attend SSV side event', 2),
    ('daily_role', 'Travel', 'Travel', 3),
    ('daily_role', 'HR', 'HR', 4),
    ('daily_role', 'Set up SSV Event', 'Set up SSV Event', 5),
    ('daily_role', 'Professional Meetings', 'Professional Meetings', 6),
    ('daily_role', 'SSV team event', 'SSV team event', 7),
    ('daily_role', 'Panel Member', 'Panel Member', 8),
    ('daily_role', 'Side Events', 'Side Events', 9),
    ('daily_role', 'Attend SSV booth', 'Attend SSV booth', 10),
    ('daily_role', 'Main Venue', 'Main Venue', 11),
    ('daily_role', 'Speaker', 'Speaker', 12),
    ('daily_role', 'Lead hunting', 'Lead hunting', 13)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO app_options (category, label, value, position)
VALUES
    ('data_status', 'Info upload', 'Info upload', 1),
    ('data_status', 'waiting', 'waiting', 2)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO app_options (category, label, value, position)
VALUES
    ('approval_status', 'Awaiting Response', 'Awaiting Response', 1),
    ('approval_status', 'Need More Information', 'Need More Information', 2),
    ('approval_status', 'Approved', 'Approved', 3),
    ('approval_status', 'Not Approved', 'Not Approved', 4)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO events (name, location, event_status, start_date, end_date)
VALUES
    ('ETH CC', 'Cannes, France', 'Pre Event', '2026-03-30', '2026-04-03'),
    ('ETH Denver 2026', 'Denver, CO, USA', 'Pre Event', '2026-02-17', '2026-02-21'),
    ('EthCC 2026', 'Cannes, France', 'Pre Event', '2026-03-30', '2026-04-03'),
    ('DAS NYC 2026', 'NYC, USA', 'Pre Event', '2026-03-24', '2026-03-26'),
    ('Consensus HK 2025', 'Hong Kong', 'Post Event', '2025-02-18', '2025-02-20'),
    ('ETH Denver', 'Denver, CO, USA', 'Post Event', '2025-02-23', '2025-03-02'),
    ('Token 2049 /ETHDubai 2025', 'Dubai', 'Post Event', '2025-04-28', '2025-05-01'),
    ('HK Web3 Festival', 'Hong Kong', 'Post Event', '2025-04-06', '2025-04-09'),
    ('Consensus Toronto', 'Toronto', 'Post Event', '2025-05-14', '2025-05-16'),
    ('Token 2049 Singapore', 'Singapore', 'Post Event', '2025-10-01', '2025-10-02'),
    ('DevConnect Argentina', 'Argentina', 'Post Event', '2025-11-14', '2025-11-22'),
    ('Korea Blockchain Week', 'Korea', 'Post Event', '2025-09-22', '2025-09-28'),
    ('Vietnam Blockchain Week', 'Vietnam', 'Canceled', '2025-08-01', '2025-08-02')
ON CONFLICT (name) DO NOTHING;
