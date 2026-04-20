# Travel Desk — Deployment Handoff for Vaclav

**Date:** 2026-04-19
**App:** Internal SSV Labs travel request system
**Stack:** React (Vite/TypeScript) frontend + Node/Express backend + PostgreSQL
**Access:** Internal only — `ssvlabs.io` accounts via Google OAuth

---

## What to Tell Vaclav

> "I built an internal travel request app for SSV Labs — React frontend, Node/Express backend, PostgreSQL. Internal-only, ssvlabs.io accounts only via Google OAuth. I need your help getting it into the cluster. Here's what it needs."

---

## Database

- **Staging:** CloudNativePG operator
- **Production:** AWS RDS (small instance, low traffic, internal only)

Schema is self-contained in `backend/database_schema.sql`. Backend applies it on startup (idempotent `IF NOT EXISTS`). Vaclav may want to formalize as a migration job later — not blocking for now.

**Ask:** Provision Postgres in staging first. Once CloudNativePG creates it and generates credentials, store `DATABASE_URL` in Vault.

---

## Secrets (all go into Vault)

| Secret | What it is |
|--------|-----------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Gmail API token for sending notifications |
| `JWT_SECRET` | Long random string for session signing |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/travel_requests` |
| `service-account.json` | Google service account file (in `backend/service-account.json`) |

Service account already exists: `travel-desk-directory-reader@ssvlabs-travel-desk-prod.iam.gserviceaccount.com`
Mount path (hardcoded in app + manifests): `/var/run/secrets/travel-desk/service-account.json`

---

## What Vaclav Sets Up

1. **ECR repos** — `travel-desk-frontend` and `travel-desk-backend`
2. **GitHub Actions CI** — private repo → GitHub Actions (not Argo Sensors). Pipeline: build → push to ECR → update GitOps repo with new image tag
3. **Helm chart** — in `ssvlabs/charts`. Two deployments: frontend (Nginx + static) and backend (Node). Base it on `k8s/minikube/` manifests — they show the exact shape
4. **ArgoCD Application CRD** — `gitops-stage` first, then `gitops-production`
5. **Ingress** — hostname `travel.ssvlabs.io`. External DNS auto-creates Route53 record once ingress is live
6. **ConfigMap** — non-sensitive config listed in `docs/production-handoff.md`

---

## What Vaclav Gets from Ilan

- Repo access (see Step 1 below — move out of experiments first)
- `backend/database_schema.sql`
- `docs/production-handoff.md` — full env var list, K8s structure, verification checklist
- `k8s/minikube/` — deployment shape for Helm chart reference
- `backend/service-account.json` — Google service account
- Gmail refresh token (Ilan still needs to generate — see Step 4 below)

---

## Ilan's Steps Before / Alongside Vaclav

### Step 1 — Move repo out of experiments
Create `ssvlabs/travel-desk` on GitHub and push the code. Currently lives in `~/src/experiments/Travel-Requests` — not a good home for a production app. Vaclav needs a proper repo to wire up CI.

### Step 2 — Verify Google Groups exist
Create in Google Workspace Admin if missing, and populate:
- `travel-app-admins@ssvlabs.io` — admin access (Alon, Keren)
- `travel-app-user@ssvlabs.io` — manager access (anyone who can submit)

### Step 3 — Add production callback URL to OAuth client
Google Cloud Console → OAuth client → Authorized redirect URIs → add:
```
https://travel.ssvlabs.io/auth/google/callback
```

### Step 4 — Generate Gmail refresh token
Missing piece — needed for notification emails:
1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground)
2. Gear icon → "Use your own OAuth credentials" → enter client ID + secret
3. Authorize scope: `https://mail.google.com/`
4. Exchange authorization code for tokens → copy the refresh token
5. Hand to Vaclav for Vault storage

### Step 5 — Hand off to Vaclav
30-min session. Give him: repo access, `docs/production-handoff.md`, schema SQL, service-account.json, refresh token.

### Step 6 — Staging verification
Once deployed to staging, run the checklist in `docs/production-handoff.md`:
- Login with ssvlabs.io account
- Submit a request
- Approve it
- Confirm notification emails arrive

### Step 7 — Production
Staging green → Vaclav promotes to production → `travel.ssvlabs.io` live.

---

## Open Questions (confirm with Yoav / before Vaclav session)

- Do `travel-app-admins@ssvlabs.io` and `travel-app-user@ssvlabs.io` Google Groups already exist?
- Single approver (Yoav) or department-based routing?
- Who else gets notifications — just Yoav + Tamar, or finance/ops too?
- Submit permissions — managers only, or broader internal roles?
