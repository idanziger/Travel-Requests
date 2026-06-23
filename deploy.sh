#!/usr/bin/env bash
# One-command deploy for the Travel Requests app.
# Builds from local source, pushes via Cloud Build, redeploys to Cloud Run.
# Reuses all env vars / secrets / Cloud SQL config from the existing service.
set -euo pipefail
gcloud run deploy travel-requests \
  --source=. \
  --account=ilan@ssvlabs.io \
  --project=travel-request-app-491919 \
  --region=europe-west1
echo "Deployed. Live at https://travel.ssvlabs.io"
