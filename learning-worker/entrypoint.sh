#!/bin/sh
set -eu
# Railway mounts a fresh persistent volume as root. Drop privileges before app/Codex execution.
mkdir -p "${DATA_DIR:-/data}"
chown -R learner:learner "${DATA_DIR:-/data}"
exec runuser -u learner -- "$@"
