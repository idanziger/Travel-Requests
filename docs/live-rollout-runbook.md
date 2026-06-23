# Travel Desk: Live Rollout Runbook for Ilan

## Goal Of The Session

Leave the meeting with Vaclav aligned on:
- deployment target and ownership split
- staging-first rollout
- exact secrets/config inputs
- repo migration plan
- what he needs from you immediately after the meeting

## The Opening

Say this in the first two minutes:

> I built an internal Travel Desk app for SSV Labs. It is already working locally end to end. It uses a React frontend, Node/Express backend, PostgreSQL, Google OAuth, Google Groups for authorization, Workspace directory lookup, and Gmail API notifications. I want your help getting it deployed cleanly through the normal company path, staging first.

Then add:

> I am not asking for architecture work unless you think something must change. I want to use the existing app shape and fit it into the company deployment model.

## What You Should Show Him

Show these files in this order:

1. `docs/vaclav-one-pager.md`
2. `DEPLOYMENT_VACLAV.md`
3. `docs/production-handoff.md`
4. `k8s/minikube/backend.yaml`
5. `k8s/minikube/frontend.yaml`
6. `k8s/minikube/postgres.yaml`

## What You Should Explain About The App

Keep this concise:

- Internal-only app for `ssvlabs.io`
- Frontend is a static SPA
- Backend exposes API routes and `GET /health`
- Database schema lives in `backend/database_schema.sql`
- Auth is Google OAuth plus Google Group role resolution
- Traveler lookup uses Google Admin SDK
- Notifications use Gmail API
- Roles:
  - admin can approve and manage settings
  - manager can submit and see own requests
  - coordinator can submit and see all requests but cannot approve
  - travelers can see requests created for them

## Ask Vaclav These Questions

Use these as the meeting agenda:

1. What is the preferred home for the production repo?
   You need a real org repo before CI/CD and GitOps can happen.

2. What deployment path do you want for this app?
   Current assumption is GitHub Actions -> ECR -> Helm chart -> ArgoCD.

3. How do you want staging structured?
   Ask for namespace, hostname, database provisioning, and secret path conventions.

4. What is the preferred database path?
   Current repo docs assume staging via CloudNativePG and production via managed Postgres, but confirm his actual preference.

5. How should the Google service account JSON be delivered?
   The app expects it mounted at `/var/run/secrets/travel-desk/service-account.json`.

6. Does he want schema init left in app startup for now, or split into a migration/init job?

7. What does he need from you to begin immediately after the meeting?

## Decisions You Need From Him

Do not leave without answers or at least owners for:

- repo destination
- CI/CD path
- staging database owner
- secrets/Vault path
- ingress hostname plan
- service-account secret mount method
- whether he wants any manifest or app changes before he accepts the handoff

## What You Need To Bring

- access to this repo
- `docs/production-handoff.md`
- `backend/database_schema.sql`
- Google service account JSON
- Gmail refresh token
- the Google group names already in use:
  - `travel-app-admins@ssvlabs.io`
  - `travel-app-user@ssvlabs.io`

## Things To Say If He Pushes Back

If he says the repo is not production-ready:

> Agreed. The first unblock is moving it into a proper `ssvlabs` repo so you can wire CI and GitOps.

If he says startup schema init is not ideal:

> Agreed. I am fine with keeping it temporarily for staging, and then changing it to a migration job if you want that before production.

If he says secrets handling must change:

> That is expected. The app already supports env-based config and a mounted service-account file. I only need the final Vault and mount pattern from you.

If he says the platform path should differ from the assumed AWS/K8s route:

> That is fine. The main requirement is keeping frontend/backend split, PostgreSQL, mounted service-account JSON, and the production env contract.

## Implementation Sequence After The Meeting

1. Create or request the org repo, likely `ssvlabs/travel-desk`
2. Push this code there without rewriting the app first
3. Hand Vaclav the production handoff doc and secret inventory
4. Provide Google OAuth, Gmail, JWT, DB, and service-account inputs for Vault
5. Add any callback URL or hostname values needed for staging
6. Support his staging deployment
7. Run the production verification checklist in staging
8. Fix deployment issues
9. Promote only after staging is clean

## Your Immediate Follow-Up Message After The Session

Send something like:

> Thanks. To confirm, I will move the repo to `<repo>`, provide the secrets and service-account file, and confirm the business-side routing decisions. You will set up `<ci path>`, `<db path>`, `<chart/app path>`, and staging ingress. Once staging is ready, I will run the verification checklist and report back before any production cutover.

## Verification Checklist For Staging

- Google login works with `ssvlabs.io`
- non-`ssvlabs.io` users are denied
- admin group resolves correctly
- manager group resolves correctly
- coordinator override works for `tamar@ssvlabs.io`
- traveler lookup returns Workspace users
- request submission works
- request status updates work
- notification emails are delivered
- backend `GET /health` returns `200`

## Risks To Mention Explicitly

- repo migration is the main non-technical blocker
- some credentials were previously exposed during setup and should be rotated before or during productionization
- notification routing and approval policy still need business confirmation if they have changed
