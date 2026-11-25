#!/usr/bin/env bash
set -euo pipefail
umask 022

# Only the GitHub deploy key uses this forced command.
read -r verb target release extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ $verb == wareflow-release && $release =~ ^gha-[0-9]+-[0-9]+$ && -z $extra ]]
cd /opt/wareflow
exec 9>/run/lock/wareflow-ci-release.lock
flock 9

stage=$(mktemp -d /opt/wareflow/.ci-stage.XXXXXXXX)
trap 'find "$stage" -depth -delete' EXIT

frontend_release() {
    local root=/opt/wareflow/frontend/dist asset served
    python3 -c '
from pathlib import Path, PurePosixPath
import shutil, sys, tarfile
root = Path(sys.argv[1])
total = 0
with tarfile.open(fileobj=sys.stdin.buffer, mode="r|gz") as archive:
    for item in archive:
        path = PurePosixPath(item.name)
        if path.is_absolute() or ".." in path.parts or not (item.isdir() or item.isfile()):
            raise SystemExit("Unsupported frontend archive member")
        destination = root.joinpath(*path.parts)
        if item.isdir():
            destination.mkdir(parents=True, exist_ok=True)
        else:
            total += item.size
            if total > 64 * 1024 * 1024:
                raise SystemExit("Frontend archive exceeds 64 MiB")
            destination.parent.mkdir(parents=True, exist_ok=True)
            with destination.open("xb") as stream:
                shutil.copyfileobj(archive.extractfile(item), stream)
' "$stage"
    asset=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$stage/index.html")
    test -s "$stage$asset"
    cp "$root/index.html" "$stage/previous.html"
    cp -a "$stage/assets/." "$root/assets/"
    while IFS= read -r -d '' file; do cp -a "$file" "$root/"; done \
        < <(find "$stage" -mindepth 1 -maxdepth 1 ! -name assets ! -name index.html ! -name previous.html -print0)
    mv -f "$stage/index.html" "$root/index.html"
    if docker exec wareflow-frontend nginx -s reload &&
        served=$(docker exec wareflow-frontend wget -qO- http://127.0.0.1/) &&
        [[ $served == *"$asset"* ]] &&
        docker exec wareflow-frontend wget -q --spider "http://127.0.0.1$asset"; then
        echo "Frontend serves $asset"
        return
    fi
    mv -f "$stage/previous.html" "$root/index.html"
    docker exec wareflow-frontend nginx -s reload
    echo 'Frontend restored to previous entry page' >&2
    return 1
}

backend_release() {
    local service=$1 port=$2 image old backup candidate need available
    export COMPOSE_ANSI=never COMPOSE_PROGRESS=plain
    image="wareflow-$service"
    candidate="$image:$release"
    backup="$image:rollback-$release"
    (ulimit -f 131072; cat > "$stage/app.jar")
    test -s "$stage/app.jar"
    sync "$stage/app.jar"
    need=$(( $(stat -c %s "$stage/app.jar") / 512 + 32768 ))
    available=$(df -Pk /var/lib/docker | awk 'NR==2 {print $4}')
    if ((available < need)); then echo "Insufficient disk to build $service" >&2; return 1; fi
    old=$(docker container inspect --format '{{.Image}}' "$image")
    docker tag "$old" "$backup"
    printf 'FROM %s\nCOPY app.jar /app/app.jar\n' "$backup" > "$stage/Dockerfile"
    docker build --pull=false -q -t "$candidate" "$stage"
    rm -f -- "$stage/app.jar" "$stage/Dockerfile"
    docker tag "$candidate" "$image:latest"
    healthy() {
        for ((attempt = 0; attempt < 100; attempt++)); do
            if curl -fsS --max-time 3 "http://127.0.0.1:$port/actuator/health" 2>/dev/null |
                grep -q '"status":"UP"'; then return 0; fi
            sleep 2
        done
        return 1
    }
    if docker compose up -d --no-deps --no-build --pull never "$service" &&
        [[ $(docker container inspect --format '{{.Image}}' "$image") = "$(docker image inspect --format '{{.Id}}' "$candidate")" ]] &&
        healthy; then
        echo "$service UP. Rollback image: $backup"
        return 0
    fi
    docker tag "$backup" "$image:latest"
    docker compose up -d --no-deps --no-build --pull never "$service"
    healthy && echo "$service restored from $backup"
    return 1
}

case "$target" in
    frontend) frontend_release ;;
    core-service) backend_release core-service 8081 ;;
    inventory-service) backend_release inventory-service 8082 ;;
    finance-service) backend_release finance-service 8083 ;;
    delivery-service) backend_release delivery-service 8084 ;;
    api-gateway) backend_release api-gateway 8080 ;;
    config-server) backend_release config-server 8888 ;;
    eureka-server) backend_release eureka-server 8761 ;;
    *) echo 'Unsupported deploy target' >&2; exit 2 ;;
esac
