# Travel Desk: One-Page Briefing for Vaclav

## What This Is

Travel Desk is an internal SSV Labs travel request application intended to replace the current Monday workflow.

Current stack:
- Frontend: React + Vite + TypeScript SPA
- Backend: Node + Express + TypeScript API
- Database: PostgreSQL
- Auth: Google OAuth for `ssvlabs.io` accounts only
- Authorization: Google Groups plus a coordinator override
- Notifications: Gmail API

This is an internal, low-traffic application. It is already working locally and has a complete environment contract, a database schema, Dockerfiles, and a reference Kubernetes deployment under `k8s/minikube/`.

## What The App Actually Does

- Google sign-in for `ssvlabs.io` users only
- Role resolution:
  - `travel-app-admins@ssvlabs.io` -> admin
  - `travel-app-user@ssvlabs.io` -> manager
  - `tamar@ssvlabs.io` -> coordinator override
- Traveler lookup from Google Workspace directory
- Travel request submission
- Admin approval flow
- Dashboard grouped by status:
  - `Awaiting Response`
  - `Need More Information`
  - `Approved`
  - `Not Approved`
- Admin settings for:
  - events
  - departments
  - cost centers
  - budgets
  - daily roles
  - data statuses
  - approval statuses
- Email notifications on submission and status change

## Deployment Ask

I need your help getting this into the cluster using the normal SSV path:

- proper GitHub repo under the org
- CI to build and push frontend/backend images
- Helm chart for separate frontend/backend workloads
- ArgoCD application for staging first
- Vault-managed secrets
- PostgreSQL
- HTTPS ingress for `travel.ssvlabs.io`

I am not asking for a redesign. The main work is packaging, secrets, database, and GitOps wiring.

## Existing Deployment Shape

The repo already contains a working reference structure in `k8s/minikube/`:

- namespace: `travel-requests`
- separate backend deployment and service
- separate frontend deployment and service
- backend readiness/liveness on `GET /health`
- frontend served from Nginx
- service-account secret mounted at:
  - `/var/run/secrets/travel-desk/service-account.json`

## Runtime Requirements

Backend required runtime dependencies:
- PostgreSQL
- Google OAuth client ID/secret
- Gmail refresh token
- JWT secret
- Google service account JSON with domain-wide delegation

Required production behavior:
- `AUTH_MODE=google-groups`
- `COOKIE_SECURE=true`
- `FRONTEND_URL=https://travel.ssvlabs.io`
- `GOOGLE_CALLBACK_URL=https://travel.ssvlabs.io/auth/google/callback`

## Google / Identity Inputs Already Defined

- Delegated admin: `ijd_admin@ssvlabs.io`
- Admin group: `travel-app-admins@ssvlabs.io`
- User group: `travel-app-user@ssvlabs.io`
- Service account:
  - `travel-desk-directory-reader@ssvlabs-travel-desk-prod.iam.gserviceaccount.com`

Domain-wide delegation scopes needed:
- `https://www.googleapis.com/auth/admin.directory.group.member.readonly`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`

## What I Will Provide

- codebase in a proper org repo
- `backend/database_schema.sql`
- env var contract from `docs/production-handoff.md`
- service-account JSON for secret storage
- Gmail refresh token for Vault
- business decisions on approvers and notification recipients

## What I Need From You

- confirm target deployment path for this app
- provision staging database first
- define image build/push path
- set up Helm/ArgoCD structure
- wire Vault secrets and service-account mount
- expose staging, then production if verification passes

## Proposed Rollout

1. Move repo into `ssvlabs/travel-desk`
2. Set up staging DB and secrets
3. Deploy staging
4. Validate login, traveler lookup, submit, approve, notifications
5. Promote to production

## Known Short-Term Caveats

- Repo is still under `experiments` and needs to move before proper CI/GitOps work
- Schema is currently applied on backend startup; acceptable for now, but could later become a migration job
- Some fallback auth code paths still exist, but production should run only with Google Groups

## Primary References

- `DEPLOYMENT_VACLAV.md`
- `docs/production-handoff.md`
- `k8s/minikube/`
