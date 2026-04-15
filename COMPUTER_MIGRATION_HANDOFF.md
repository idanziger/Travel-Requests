# Travel Requests - Computer Migration Handoff

Last updated: 2026-04-15
Repository: `Travel Requests`
Branch: `main`
Head commit: `9fac2c4` (`origin/main`)
Working tree state: clean (no uncommitted changes)

## 1) Where the project is up to now

The app is in a working full-stack state for local development and appears production-oriented for Google Workspace use.

Implemented and working:
- Google OAuth login flow
- Google Group-based role resolution (admin/manager/coordinator)
- Workspace directory lookup for traveler selection
- JWT cookie session auth
- Travel request submission and dashboard visibility rules
- Request day/role structures (morning/evening per day)
- Notification pipeline via Gmail API
- Backend + frontend production build both succeed (`npm run build-all` passed on 2026-04-15)

Codebase shape:
- `backend/`: Express + TypeScript API + PostgreSQL integration
- `frontend/`: React + Vite + TypeScript SPA
- `docker-compose.yml`: local PostgreSQL (postgres:15-alpine)
- `docs/production-handoff.md`: detailed production environment and deployment notes

## 2) What must exist on the new computer

Install:
- Node.js + npm
- Docker Desktop (or Docker Engine)

Bring over securely:
- `.env` from this repo root (or recreate from `.env.example` + fill real values)
- Google service account JSON referenced by `GOOGLE_SERVICE_ACCOUNT_FILE`

Install dependencies:
```bash
npm run install-all
```

Start local DB:
```bash
docker compose up -d
```

Run backend/frontend (separate terminals):
```bash
npm run backend
npm run frontend
```

## 3) Fast verification after moving

1. `docker compose ps` shows DB container healthy/running.
2. Backend health check works: `http://localhost:3001/health` returns `{"status":"ok"}`.
3. Frontend loads at `http://localhost:5173`.
4. Google login succeeds with a workspace account.
5. Submit a request and verify it appears in dashboard.
6. Trigger status change and confirm notification email delivery.

## 4) What still needs to be done

### High priority
- Rotate any credentials that were previously exposed during setup (called out in `docs/production-handoff.md`).
- Confirm all production env vars are explicit and remove reliance on fallback/default values.
- Validate notification recipients and policy (`PRIMARY_APPROVER_EMAILS`, `NOTIFY_ALL_EMAILS`, coordinator behavior).

### Product/Workflow decisions still open
- Finalize approval model: single approver vs department-based routing.
- Confirm exact submit permissions (manager-only vs broader internal roles).
- Confirm whether additional recipients (finance/ops) should be included in notifications.
- Confirm final default expense/category model.

### Deployment work (if not already done)
- Finalize containerization and k8s manifests for frontend/backend split workloads.
- Provision secrets/configmaps exactly as listed in `docs/production-handoff.md`.
- Mount service account secret at runtime path expected by backend.

## 5) Important references

- Local project status snapshot: `STATUS.md`
- Original project scope/phase plan: `TRAVEL_REQUEST_PLAN.md`
- Production deployment/env handoff: `docs/production-handoff.md`
- Environment template: `.env.example`

## 6) Useful commands

```bash
# Install everything
npm run install-all

# Run services
npm run backend
npm run frontend

# Build check
npm run build-all

# Database only
docker compose up -d
```
