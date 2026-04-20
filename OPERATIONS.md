# Travel Requests Operations

## Working Directory

```bash
cd ~/src/experiments/Travel-Requests
```

## Shut Down Everything

1. Stop the local frontend dev server:

```bash
lsof -ti tcp:5173 | xargs kill
```

2. Stop the local backend dev server:

```bash
lsof -ti tcp:3001 | xargs kill
```

3. Stop the local PostgreSQL container:

```bash
docker-compose down
```

4. Stop the local Kubernetes cluster:

```bash
minikube stop
```

5. Stop the local Docker runtime:

```bash
colima stop
```

## Start Local Development

1. Start the Docker runtime:

```bash
colima start
```

2. Start the local PostgreSQL container:

```bash
cd ~/src/experiments/Travel-Requests
docker-compose up -d
```

3. Start the backend in one terminal:

```bash
cd ~/src/experiments/Travel-Requests/backend
npm run dev
```

4. Start the frontend in another terminal:

```bash
cd ~/src/experiments/Travel-Requests/frontend
npm run dev -- --host 0.0.0.0
```

## Start Minikube Environment

```bash
colima start
minikube start --driver=docker
kubectl apply -k ~/src/experiments/Travel-Requests/k8s/minikube
minikube service -n travel-requests travel-requests-frontend --url
```

## Useful Checks

```bash
docker-compose ps
minikube status
kubectl get pods -n travel-requests
curl http://localhost:3001/health
```

## Notes

- Local development uses `.env` plus `backend/service-account.json`.
- Minikube uses `k8s/minikube/secrets.yaml` and the `travel-requests-service-account` Kubernetes secret.
- If the local backend or frontend has stale config, restart its dev process after editing `.env`.
