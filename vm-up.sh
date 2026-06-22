#!/usr/bin/env bash
# Create OCI VM (optional) then deploy
set -euo pipefail
export PATH="$HOME/bin:$PATH"

case "${1:-}" in
  --provision)
    command -v oci &>/dev/null || { echo "OCI CLI not found"; exit 1; }
    command -v jq  &>/dev/null || { echo "jq not found: brew install jq"; exit 1; }
    bash ./provision-oci.sh
    ;;
  ""| --deploy)
    bash ./deploy.sh
    ;;
  *)
    echo "Usage: $0 [--provision | --deploy]"; exit 1 ;;
esac
