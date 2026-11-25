#!/usr/bin/env bash
set -euo pipefail

artifacts=$1
shift
: "${VPS_HOST:?Set the production VPS_HOST variable}"
: "${VPS_USER:?Set the production VPS_USER variable}"
: "${VPS_SSH_PRIVATE_KEY:?Set the production SSH private key}"
: "${VPS_SSH_KNOWN_HOSTS:?Set the pinned VPS host key}"
[[ $VPS_HOST =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ && $VPS_USER =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]]
release="gha-${GITHUB_RUN_ID:-$(date +%s)}-${GITHUB_RUN_ATTEMPT:-1}"
[[ $release =~ ^gha-[0-9]+-[0-9]+$ ]]

umask 077
ssh_dir=$(mktemp -d)
trap 'rm -f -- "$ssh_dir/key" "$ssh_dir/known_hosts"; rmdir -- "$ssh_dir"' EXIT
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$ssh_dir/key"
printf '%s\n' "$VPS_SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
unset VPS_SSH_PRIVATE_KEY VPS_SSH_KNOWN_HOSTS
remote=(ssh -T -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes
    -o ServerAliveInterval=15 -o ServerAliveCountMax=4 -o ConnectTimeout=15
    -o UserKnownHostsFile="$ssh_dir/known_hosts" -i "$ssh_dir/key" "$VPS_USER@$VPS_HOST")

for target in "$@"; do
    case "$target" in
        frontend)
            tar -cz -C "$artifacts/frontend" . | "${remote[@]}" "wareflow-release $target $release"
            ;;
        core-service|inventory-service|finance-service|delivery-service|api-gateway|config-server|eureka-server)
            jars=("$artifacts/$target/"*-SNAPSHOT.jar)
            [[ ${#jars[@]} == 1 && -s "${jars[0]}" ]]
            "${remote[@]}" "wareflow-release $target $release" < "${jars[0]}"
            ;;
        *) echo 'Unsupported deploy target' >&2; exit 2 ;;
    esac
done
