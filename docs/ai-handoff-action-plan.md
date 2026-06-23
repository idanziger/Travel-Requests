# Travel Desk AI Handoff Action Plan

Last updated: 2026-04-23

## Purpose

This document is the current handoff/state file for the Travel Desk application so a future AI agent or engineer can quickly understand:

- what the app already does
- what Yoav asked to change on 2026-04-23
- what is still open for deployment
- what security issues must be fixed before rollout

Primary references used to create this:

- `docs/production-handoff.md`
- `DEPLOYMENT_VACLAV.md`
- `COMPUTER_MIGRATION_HANDOFF.md`
- `GOOGLE_TRAVEL_DESK_CREDENTIALS.md`
- `k8s/minikube/`
- meeting notes:
  - `/Users/Ilan/Downloads/Ilan __ Yoav_ Weekly Sync - 2026_04_23 12_47 IDT - Notes by Gemini.md`

## Current App State

The app is already functional as an internal Google Workspace travel-request system.

Implemented now:

- Google OAuth login for `ssvlabs.io`
- role resolution via Google Groups plus a coordinator override
- Workspace traveler search
- request submission
- request dashboard with grouped statuses
- admin settings for events and option lists
- PostgreSQL persistence
- email notifications
- frontend/backend split with Dockerfiles
- reference Kubernetes deployment shape in `k8s/minikube/`

Key behavior already present in code:

- traveler must be selected from Workspace search, not typed as free text
- request days are auto-generated from start and end dates
- approver notes are visible in the dashboard to non-admin viewers
- status-change emails already notify requester and traveler

## Product Decisions From Yoav Meeting

Meeting date: 2026-04-23

Decisions captured from the notes:

- traveler selection must be restricted to company personnel only
- event dates should not hard-limit request dates
- daily schedule rows should remain explicitly selectable by managers
- approver notes should be visible to both requester and traveler
- status-change communication should be sent once after the approver is done editing, not as multiple fragmented emails
- once approved, follow-on communication may include reimbursement, booking, and insurance information
- Tamar should review the flow after the next round of functional updates

## Yoav Action Items: Status Review

### Already Fully Or Mostly Implemented

1. Restrict traveler to company personnel
   Current state:
   - traveler field is driven by Workspace search
   - the form already requires selecting a traveler from directory results
   Remaining concern:
   - current backend directory search may still be broader than desired for general authenticated users

2. Add note below traveler field
   Current state:
   - the form already shows guidance: select a traveler from Google Workspace
   Possible improvement:
   - update the copy to be more explicit about "SSV Labs employees only"

3. Hardcoded daily schedule behavior
   Current state:
   - the number of day rows is generated automatically from the requested date range
   - morning/evening role values are selected from admin-managed option lists
   Clarification needed:
   - if Yoav means fully fixed predefined role choices, this is effectively already modeled through admin-configured `daily_role` options

4. Persistent database
   Current state:
   - PostgreSQL is already used
   Remaining work:
   - production/staging database provisioning and deployment

5. Internal notes visible to requester and traveler
   Current state:
   - notes are already visible in the dashboard
   Remaining work:
   - include notes explicitly in status-change email content if that is required

### Partially Implemented / Needs Refinement

1. FYI conference date range during submission
   Current state:
   - event start/end dates exist in the system
   Missing:
   - inline FYI display in the submission experience that surfaces the official conference dates

2. Optimize notifications so they trigger only after final save
   Current state:
   - status-change email only sends when `status` is included in the update request
   Gap:
   - there is no explicit combined "save notes + status + send once" workflow contract documented or tested
   - saving notes alone does not notify, which is good, but the exact Yoav-approved UX should be confirmed

3. Add booking / reimbursement / insurance follow-up
   Current state:
   - not implemented in email templates
   Missing:
   - reimbursement link
   - booking link
   - travel insurance attachment or link
   Decision still needed:
   - whether these belong only on `Approved`, and whether they should be links versus file attachments

4. Deployment visibility for Yoav
   Current state:
   - app works locally
   Missing:
   - accessible staging or production environment

5. Tamar review session
   Current state:
   - not scheduled from inside the repo

## Concrete Product / Engineering TODOs

### Product Flow

- Add an FYI block on the request form showing the selected event's official start and end dates
- Make traveler helper text more explicit:
  - "Select an SSV Labs employee from Google Workspace"
- Confirm whether approver notes must also appear in outbound approval/status emails
- Confirm the exact one-save approval workflow:
  - edit notes
  - choose status
  - click save once
  - send one notification
- Add approved-trip follow-up content:
  - finance reimbursement link
  - flight booking link
  - travel insurance policy link or attachment

### Deployment / Operations

- move repo from `~/src/experiments/Travel-Requests` to a proper org repo, likely `ssvlabs/travel-desk`
- align with Vaclav on deployment path
- provision staging PostgreSQL
- move all runtime secrets to Vault
- deploy staging first
- verify full flow with Yoav and Tamar

## Security Fixes Required Before Production

These are the most important current security items.

### Rotate Secrets

Rotate before production:

- Google OAuth client secret
- Gmail refresh token
- Google service account private key
- production `JWT_SECRET`

Why:

- repo docs explicitly state OAuth and Gmail credentials were exposed during setup and not rotated
- live credentials currently exist in the local workspace
- minikube secret files use known placeholder or weak secrets not suitable for any shared environment

### Code / Behavior Fixes

1. Add OAuth `state` protection
   Problem:
   - login flow is missing `state`
   Risk:
   - login CSRF / session swapping

2. Make production auth fail closed
   Problem:
   - code can fall back to allowlist/domain-based roles if Google Groups are unavailable
   Risk:
   - broader internal access than intended

3. Remove hardcoded fallback admin users from production behavior
   Problem:
   - code seeds default admin allowlist values
   Risk:
   - group removal may not actually revoke admin access

4. Lock down or remove debug endpoints
   Problem:
   - non-production debug routes expose group membership information
   Risk:
   - internal identity and group data leakage in dev/staging mistakes

5. Reassess directory search permissions
   Problem:
   - authenticated users can search Workspace directory
   Risk:
   - internal directory enumeration beyond intended scope
   Decision needed:
   - should only submit-capable roles be allowed to search travelers?

### Deployment Safety Requirements

- production must use `AUTH_MODE=google-groups`
- production must use `COOKIE_SECURE=true`
- production must be HTTPS only
- production secrets must not come from `k8s/minikube/*`
- service-account JSON must be mounted from secret management, not committed files

## Suggested Priority Order

### P0

- rotate secrets
- fix OAuth `state`
- remove fail-open auth behavior
- remove hardcoded admin fallback for production

### P1

- finalize repo migration
- align deployment with Vaclav
- deploy staging
- verify login, submission, approval, and notifications

### P2

- FYI event-date UX
- explicit one-save approval UX
- include approver notes in email if desired
- reimbursement / booking / insurance follow-up additions
- Tamar review session

## Open Questions

- Should any `ssvlabs.io` employee be able to log in as a viewer/traveler, or only group-authorized users?
- Should traveler directory search be available to all authenticated users, or only submit-capable roles?
- Should approver notes be included in status emails, or only visible inside the app?
- On approval, should the system send:
  - reimbursement link
  - booking link
  - insurance policy link
  - all three
- Should these approval extras come from static config, admin settings, or environment variables?
- Does Yoav want one final approver only, or could routing become department-based later?

## Next Best Implementation Plan

1. Fix the security issues first:
   - OAuth `state`
   - fail-closed auth
   - hardcoded admin fallback cleanup
   - debug endpoint restrictions
2. Rotate secrets and update local/dev/prod secret storage
3. Move repo into the org
4. Deploy staging with Vaclav
5. Implement the Yoav product refinements
6. Review the updated app with Tamar

## Notes For Future AI Agent

If resuming work from this file:

- read this file first
- then read `docs/production-handoff.md`
- then review `DEPLOYMENT_VACLAV.md`
- then inspect:
  - `backend/src/auth.ts`
  - `backend/src/google-groups.ts`
  - `backend/src/index.ts`
  - `backend/src/notifications.ts`
  - `frontend/src/pages/NewRequest.tsx`
  - `frontend/src/pages/Dashboard.tsx`

Start with security and deployment readiness before adding more product features.
