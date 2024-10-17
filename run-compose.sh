#!/bin/bash

ENV_FILE="./web/.env"
SECRETS_DIR="./secrets"

mkdir -p $SECRETS_DIR

if [ ! -f "$ENV_FILE" ]; then
    echo ".env file not found in the web folder."
    exit 1
fi

echo "Creating secret files..."
while IFS='=' read -r key value; do
  if [[ -n "$key" && "$key" != \#* ]]; then
    echo "$value" > "$SECRETS_DIR/$key"
    echo "Created secret file: $key"
  fi
done < "$ENV_FILE"

echo "Running docker-compose..."
docker-compose up --build
# docker-compose up --build --no-deps web