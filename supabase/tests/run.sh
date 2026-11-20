#!/usr/bin/env bash
# Runs the permission tests against a throwaway local PostgreSQL 16 cluster.
set -euo pipefail
# PostgreSQL refuses to run as root: re-run as the postgres user
if [ "$(id -u)" = 0 ]; then
  tmp="$(mktemp -d)"; cp -r "$(cd "$(dirname "$0")/.." && pwd)/." "$tmp/"; chown -R postgres "$tmp"
  exec runuser -u postgres -- bash "$tmp/tests/run.sh"
fi
here="$(cd "$(dirname "$0")" && pwd)"
dir="$(mktemp -d)"
trap 'pg_ctl -D "$dir" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$dir"' EXIT
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | tail -1)"
export PATH="$PGBIN:$PATH"
initdb -D "$dir" -U postgres -A trust >/dev/null
pg_ctl -D "$dir" -o "-k $dir -c listen_addresses=''" -l "$dir/log" start >/dev/null
psql() { command psql -h "$dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql -f "$here/00_supabase_shim.sql"
psql -f "$here/../migrations/20261120000000_command_center.sql"
psql -f "$here/10_permissions.sql" 2>&1 | sed -n 's/^psql:[^ ]* NOTICE:  //p; s/^NOTICE:  //p; /ERROR/p'
