#!/usr/bin/env bash
# Sync code to VM and run docker compose
set -euo pipefail

VM_IP=$(jq -r '.public_ip' .oci-state.json 2>/dev/null || true)
VM_KEY="./keys/oci_vm_key"
VM_USER="ubuntu"
REMOTE="/opt/sri-diagnostics"

[[ -z "$VM_IP" || "$VM_IP" == "null" ]] && { echo "ERROR: no public_ip in .oci-state.json"; exit 1; }
[[ ! -f "deploy/.env.production" ]] && { echo "ERROR: deploy/.env.production not found — copy deploy/.env.production.example and fill in values"; exit 1; }

SSH="ssh -i $VM_KEY -o StrictHostKeyChecking=accept-new $VM_USER@$VM_IP"

echo "→ Syncing to $VM_IP..."

rsync -az --delete -e "ssh -i $VM_KEY -o StrictHostKeyChecking=accept-new" \
  --exclude='.git' --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='dist/' \
  backend/ $VM_USER@$VM_IP:$REMOTE/backend/

rsync -az --delete -e "ssh -i $VM_KEY -o StrictHostKeyChecking=accept-new" \
  --exclude='.git' --exclude='node_modules' --exclude='dist/' \
  frontend/ $VM_USER@$VM_IP:$REMOTE/frontend/

scp -i $VM_KEY -o StrictHostKeyChecking=accept-new \
  deploy/docker-compose.prod.yml $VM_USER@$VM_IP:$REMOTE/docker-compose.yml

scp -i $VM_KEY -o StrictHostKeyChecking=accept-new \
  deploy/.env.production $VM_USER@$VM_IP:$REMOTE/.env

$SSH "chmod 600 $REMOTE/.env"

echo "→ Building and starting containers..."
$SSH "cd $REMOTE && docker compose up --build -d && docker compose ps"

echo ""
echo "✔ http://$VM_IP"
