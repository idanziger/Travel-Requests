# Minikube Deployment

This folder contains a local Kubernetes deployment for Travel Requests.

## What it does

- Runs PostgreSQL inside Minikube
- Runs the backend as a separate deployment
- Runs the frontend behind Nginx, with `/api` and `/auth` proxied to the backend
- Uses local placeholder secrets so the stack can boot before the real Google credentials are restored

## Build images into Minikube

```bash
minikube image build -t travel-requests-backend:dev -f backend/Dockerfile .
minikube image build -t travel-requests-frontend:dev -f frontend/Dockerfile --build-opt build-arg:VITE_API_BASE_URL= .
```

## Deploy

```bash
kubectl apply -k k8s/minikube
kubectl get pods -n travel-requests
minikube service -n travel-requests travel-requests-frontend --url
```

## Credentials still required

Replace the placeholder values in `k8s/minikube/secrets.yaml` before expecting Google login, directory search, or Gmail notifications to work:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `NOTIFICATION_FROM_EMAIL`

If you restore the real service account JSON, mount it at:

`/var/run/secrets/travel-desk/service-account.json`
