# Travel Desk Google Credential Handoff

Last updated: 2026-04-19

## OAuth Client

- Project/app name: `SSV Labs Travel Desk`
- OAuth client ID:
  `stored offline, not committed to repo`
- OAuth client secret:
  `stored offline, not committed to repo`

## Notification Email

- Sender account: `john.doe@ssvlabs.io`

## OAuth Playground Output Provided

- Authorization response included code:
  `redacted`
- Token exchange response included refresh token:
  `stored offline, not committed to repo`

## Google Admin / Workspace

- Delegated admin account: `ijd_admin@ssvlabs.io`
- Admin group: `travel-app-admins@ssvlabs.io`
- User group: `travel-app-user@ssvlabs.io`
- Domain-wide delegation: completed

## Service Account Installed

- Local source file used:
  `/Users/Ilan/Downloads/ssvlabs-travel-desk-prod-d35791f6f97f.json`
- Local app path:
  `backend/service-account.json`
- Service account email:
  `travel-desk-directory-reader@ssvlabs-travel-desk-prod.iam.gserviceaccount.com`
- IAM client ID:
  `110660343923380334640`
- Key ID:
  `d35791f6f97fdade18c1a4e6135c121da26bcc99`

## Kubernetes Service Account Mount

- Secret name:
  `travel-requests-service-account`
- Mounted path:
  `/var/run/secrets/travel-desk/service-account.json`

## Where This Was Applied

- Local app env:
  [.env](/Users/Ilan/src/experiments/Travel-Requests/.env:1)
- Minikube secret manifest:
  [k8s/minikube/secrets.yaml](/Users/Ilan/src/experiments/Travel-Requests/k8s/minikube/secrets.yaml:1)
- Backend deployment mount:
  [k8s/minikube/backend.yaml](/Users/Ilan/src/experiments/Travel-Requests/k8s/minikube/backend.yaml:1)

## Repo Safety

- Live OAuth credentials and refresh tokens were removed from the git-tracked repo files.
- Real values should be kept in a password manager, local `.env`, or a secret manager, not committed.
