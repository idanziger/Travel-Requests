# Travel Desk Production Handoff

## Purpose

This document is the deployment handoff for the internal SSV Labs Travel Desk application.

The application is an internal Google Workspace application for `ssvlabs.io` users only. It supports:

- Google sign-in
- Google Group based authorization
- Workspace user lookup for traveler selection
- Request submission and approval workflow
- Gmail notification delivery

## Current Status

Working now:

- Google OAuth login
- Google Group membership checks
- Google Workspace user lookup for traveler autocomplete
- JWT session cookie auth
- Request submission
- Dashboard visibility
- Email notifications

Known non-blocking production concerns:

- Credentials that were exposed during setup were not rotated by explicit user choice
- Some emergency fallback env variables still exist as supported code paths, even if left empty
- `tamar@ssvlabs.io` is intentionally modeled as a special coordinator override, not group-derived

## Runtime Model

### Frontend

- Vite-built static SPA
- Calls backend API with credentials enabled

### Backend

- Node/Express API
- PostgreSQL database
- Google OAuth for identity
- Google Admin SDK for group membership and user directory
- Gmail API for notifications
- JWT session in HTTP-only cookie

## Authorization Model

### Google Groups

- Admin group: `travel-app-admins@ssvlabs.io`
- Manager group: `travel-app-user@ssvlabs.io`

### Special Cases

- `tamar@ssvlabs.io` is configured as `coordinator`
- Coordinators can submit and see all requests, but cannot approve

### Effective Roles

- `admin`
  - full access
  - approve/reject
  - manage settings
- `manager`
  - submit requests
  - see requests they submitted
- `coordinator`
  - submit requests
  - see all requests
  - cannot approve
- traveler visibility
  - any user can see requests where they are the traveler

## Google Dependencies

### OAuth Client

Used for:

- browser login
- Gmail refresh-token flow

Required redirect URIs:

- local:
  - `http://localhost:3001/auth/google/callback`
- production:
  - `https://travel.ssvlabs.io/auth/google/callback`
- OAuth Playground:
  - `https://developers.google.com/oauthplayground`

### Service Account

Used for:

- Google Group membership checks
- Google Workspace user lookup

Configured service account:

- `travel-desk-directory-reader@ssvlabs-travel-desk-prod.iam.gserviceaccount.com`

Delegated admin:

- `ijd_admin@ssvlabs.io`

### Domain-Wide Delegation Scopes

The service account client must be authorized in Google Admin with:

- `https://www.googleapis.com/auth/admin.directory.group.member.readonly`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`

## Notification Routing

### Submit Notification

Recipients:

- `yoav@ssvlabs.io`
- `tamar@ssvlabs.io`
- requester
- traveler

### Status Change Notification

Recipients:

- `yoav@ssvlabs.io`
- `tamar@ssvlabs.io`
- requester
- traveler

### Admin Access Without Routine Notifications

- `alon@ssvlabs.io`
- `keren@ssvlabs.io`

These users should receive access through the admin Google Group, not routine notification routing.

## Required Environment Variables

### Backend Required

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>

GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
GOOGLE_CALLBACK_URL=https://travel.ssvlabs.io/auth/google/callback

AUTH_MODE=google-groups
ALLOWED_EMAIL_DOMAIN=ssvlabs.io

ADMIN_EMAIL=ijd_admin@ssvlabs.io
ADMIN_GROUP_EMAIL=travel-app-admins@ssvlabs.io
USER_GROUP_EMAIL=travel-app-user@ssvlabs.io
GOOGLE_SERVICE_ACCOUNT_FILE=/var/run/secrets/travel-desk/service-account.json

GOOGLE_REFRESH_TOKEN=<gmail-refresh-token>
NOTIFICATION_SENDER_NAME=SSV Labs Travel Desk
NOTIFICATION_FROM_EMAIL=john.doe@ssvlabs.io
PRIMARY_APPROVER_EMAILS=yoav@ssvlabs.io
NOTIFY_ALL_EMAILS=tamar@ssvlabs.io

COORDINATOR_EMAILS=tamar@ssvlabs.io
ADMIN_OVERRIDE_EMAILS=
MANAGER_OVERRIDE_EMAILS=
ALLOWED_MANAGER_EMAILS=
ALLOWED_EMPLOYEE_EMAILS=

FRONTEND_URL=https://travel.ssvlabs.io
JWT_SECRET=<long-random-secret>
AUTH_COOKIE_NAME=travel_requests_session
SESSION_TTL_SECONDS=28800
COOKIE_SECURE=true
```

### Notes

- `APPROVER_EMAIL` is legacy and can be ignored if `PRIMARY_APPROVER_EMAILS` is set
- `FRONTEND_URL_ALT` is only needed for local development
- leave override lists empty in production unless there is a deliberate exception

## Kubernetes Recommendations

### Deployments

Use separate workloads:

- `travel-desk-frontend`
- `travel-desk-backend`

### Backend Container

Requirements:

- Node runtime
- access to PostgreSQL
- mounted secret file for Google service account JSON
- env-based secrets for OAuth, JWT, Gmail token

### Frontend Container

Options:

- serve built static assets with Nginx
- or build into another standard static web container

### Secrets

Recommended Kubernetes secrets:

- `travel-desk-google-oauth`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- `travel-desk-gmail`
  - `GOOGLE_REFRESH_TOKEN`
  - `NOTIFICATION_FROM_EMAIL`
  - `NOTIFICATION_SENDER_NAME`
- `travel-desk-session`
  - `JWT_SECRET`
- `travel-desk-service-account`
  - `service-account.json`
- `travel-desk-db`
  - `DATABASE_URL`

### ConfigMap

Recommended ConfigMap values:

- `NODE_ENV=production`
- `PORT=3001`
- `AUTH_MODE=google-groups`
- `ALLOWED_EMAIL_DOMAIN=ssvlabs.io`
- `ADMIN_EMAIL=ijd_admin@ssvlabs.io`
- `ADMIN_GROUP_EMAIL=travel-app-admins@ssvlabs.io`
- `USER_GROUP_EMAIL=travel-app-user@ssvlabs.io`
- `GOOGLE_CALLBACK_URL=https://travel.ssvlabs.io/auth/google/callback`
- `FRONTEND_URL=https://travel.ssvlabs.io`
- `COOKIE_SECURE=true`
- `AUTH_COOKIE_NAME=travel_requests_session`
- `SESSION_TTL_SECONDS=28800`
- `PRIMARY_APPROVER_EMAILS=yoav@ssvlabs.io`
- `NOTIFY_ALL_EMAILS=tamar@ssvlabs.io`
- `COORDINATOR_EMAILS=tamar@ssvlabs.io`

### Secret Mount

Mount service-account JSON to:

- `/var/run/secrets/travel-desk/service-account.json`

Set:

- `GOOGLE_SERVICE_ACCOUNT_FILE=/var/run/secrets/travel-desk/service-account.json`

### Ingress / Networking

Production host assumption:

- `https://travel.ssvlabs.io`

Backend must allow frontend origin:

- `https://travel.ssvlabs.io`

The Google OAuth client must include:

- `https://travel.ssvlabs.io/auth/google/callback`

### Health Check

Backend health endpoint:

- `GET /health`

Use that for readiness and liveness.

## Database Notes

Schema initialization currently runs on backend startup from:

- [database_schema.sql](/Users/Ilan/src/experiments/Travel%20Requests/backend/database_schema.sql)

This is acceptable for now, but for production maturity the better model is:

- explicit versioned migrations
- migration job or init container
- app startup separate from schema mutation

## Residual Risks

### Credentials Not Rotated

OAuth and Gmail credentials were exposed during setup and were not rotated by explicit user choice.

Operationally this should be treated as accepted risk, not as a resolved issue.

### Fallback Code Paths Exist

The app still supports:

- `email-allowlist` auth mode
- override email lists

Production should run with:

- `AUTH_MODE=google-groups`
- override env lists empty, except deliberate coordinator exceptions

### Session Secret

`JWT_SECRET` must be long, random, and secret-managed in production.

## Production Verification Checklist

- [ ] Login works with `ssvlabs.io` Google account
- [ ] Non-`ssvlabs.io` accounts are denied
- [ ] Admin group users get admin access
- [ ] Manager group users can submit but not approve
- [ ] `tamar@ssvlabs.io` resolves to coordinator
- [ ] Traveler autocomplete returns Workspace users
- [ ] New request submission succeeds
- [ ] New request appears under `Awaiting Response`
- [ ] Traveler can see requests created for them
- [ ] Admin approval changes status correctly
- [ ] Submission notifications are delivered
- [ ] Status-change notifications are delivered
- [ ] Backend `/health` returns `200`
- [ ] Cookies are `Secure` in production
- [ ] OAuth callback URL matches ingress host

## Recommendation To DevOps

Deploy this as an internal production service with:

- HTTPS-only ingress
- Kubernetes-managed secrets
- mounted service-account JSON
- PostgreSQL with backups
- explicit production env values
- backend and frontend deployed separately

The remaining engineering improvement after deployment should be migration formalization, not auth redesign. Auth is now structurally correct for this internal Google Workspace application.
