#!/usr/bin/env bash
set -euo pipefail

target=$1
artifacts=$2
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

backend_release() (
    set -euo pipefail
    local service=$1 release=$2 port=$3 old image backup candidate
    export COMPOSE_ANSI=never COMPOSE_PROGRESS=plain
    cd /opt/wareflow
    image="wareflow-$service"
    candidate="$image:$release"
    backup="$image:rollback-$release"
    old=$(docker container inspect --format '{{.Image}}' "$image")
    docker tag "$old" "$backup"
    docker build --pull=false -q -t "$candidate" -
    docker tag "$candidate" "$image:latest"
    healthy() {
        for ((attempt = 0; attempt < 100; attempt++)); do
            if curl -fsS --max-time 3 "http://127.0.0.1:$port/actuator/health" 2>/dev/null |
                grep -q '"status":"UP"'; then
                return 0
            fi
            sleep 2
        done
        return 1
    }
    if docker compose up -d --no-deps --no-build --pull never "$service" &&
        [[ $(docker container inspect --format '{{.Image}}' "$image") = "$(docker image inspect --format '{{.Id}}' "$candidate")" ]] &&
        healthy; then
        echo "$service UP. Rollback image: $backup"
        exit 0
    fi
    docker tag "$backup" "$image:latest"
    docker compose up -d --no-deps --no-build --pull never "$service"
    healthy && echo "$service restored from $backup"
    exit 1
)

frontend_release() (
    set -euo pipefail
    local root=/opt/wareflow/frontend/dist stage asset served
    stage=$(mktemp -d "${root%/*}/.release.XXXXXXXX")
    trap 'find "$stage" -depth -delete' EXIT
    tar -xz -C "$stage"
    test -s "$stage/index.html"
    test -d "$stage/assets"
    asset=$(grep -oE '/assets/index-[^"]+\.js' "$stage/index.html" | head -n 1)
    test -s "$stage$asset"
    cp "$root/index.html" "$stage/previous.html"
    # Publish new hashed assets before switching the entry page. Existing browser tabs can still load old assets.
    cp -a "$stage/assets/." "$root/assets/"
    while IFS= read -r -d '' file; do
        cp -a "$file" "$root/"
    done < <(find "$stage" -mindepth 1 -maxdepth 1 ! -name assets ! -name index.html ! -name previous.html -print0)
    mv -f "$stage/index.html" "$root/index.html"
    if docker exec wareflow-frontend nginx -s reload &&
        served=$(docker exec wareflow-frontend wget -qO- http://127.0.0.1/) &&
        [[ $served == *"$asset"* ]] &&
        docker exec wareflow-frontend wget -q --spider "http://127.0.0.1$asset"; then
        echo "Frontend serves $asset"
        exit 0
    fi
    mv -f "$stage/previous.html" "$root/index.html"
    docker exec wareflow-frontend nginx -s reload
    echo 'Frontend restored to previous entry page' >&2
    exit 1
)

deploy_backend() {
    local service=$1 port=$2 stage
    local jars=("$artifacts/$service/"*-SNAPSHOT.jar)
    [[ ${#jars[@]} == 1 && -s "${jars[0]}" ]]
    stage=$(mktemp -d)
    (
        trap 'rm -f -- "$stage/app.jar" "$stage/Dockerfile"; rmdir -- "$stage"' EXIT
        cp "${jars[0]}" "$stage/app.jar"
        printf 'FROM wareflow-%s:rollback-%s\nCOPY app.jar /app/app.jar\n' "$service" "$release" > "$stage/Dockerfile"
        tar -c -C "$stage" Dockerfile app.jar |
            "${remote[@]}" "$(declare -f backend_release); backend_release '$service' '$release' '$port'"
    )
}

deploy_frontend() {
    tar -cz -C "$artifacts/frontend" . |
        "${remote[@]}" "$(declare -f frontend_release); frontend_release"
}

case "$target" in
    frontend) deploy_frontend ;;
    core-service) deploy_backend core-service 8081 ;;
    inventory-service) deploy_backend inventory-service 8082 ;;
    finance-service) deploy_backend finance-service 8083 ;;
    delivery-service) deploy_backend delivery-service 8084 ;;
    api-gateway) deploy_backend api-gateway 8080 ;;
    config-server) deploy_backend config-server 8888 ;;
    eureka-server) deploy_backend eureka-server 8761 ;;
    all)
        deploy_backend eureka-server 8761
        deploy_backend config-server 8888
        deploy_backend core-service 8081
        deploy_backend inventory-service 8082
        deploy_backend finance-service 8083
        deploy_backend delivery-service 8084
        deploy_backend api-gateway 8080
        deploy_frontend
        ;;
    *) echo "Unsupported deploy target" >&2; exit 2 ;;
esac
