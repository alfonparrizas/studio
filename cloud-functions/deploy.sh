source .env
gcloud functions deploy foncorp_cff_gateway \
  --gen2 \
  --region $GOOGLE_CLOUD_LOCATION \
  --runtime python311 \
  --source /cff-gateway/ \
  --entry-point foncorp_cff_gateway \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars=TRAVEL_AGENT_URL=$TRAVEL_AGENT_URL
