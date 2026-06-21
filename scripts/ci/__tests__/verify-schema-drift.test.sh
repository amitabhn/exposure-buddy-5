#!/usr/bin/env bash
# Story 9.1 Testing Requirements — fixture tests for scripts/ci/verify-schema-drift.sh.
# Not wired into CI (the production gate is); run manually or ad hoc to regression-test
# the gate script itself: bash scripts/ci/__tests__/verify-schema-drift.test.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/verify-schema-drift.sh"
FAILED=0

assert_exit() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" -eq "$expected" ]]; then
    echo "PASS: $desc"
  else
    echo "FAIL: $desc (expected exit $expected, got $actual)"
    FAILED=1
  fi
}

# --- Test 1: real repo state passes cleanly -----------------------------
set +e
(cd "$REPO_ROOT" && bash "$GATE" >/tmp/t1.out 2>&1)
actual=$?
set -e
assert_exit "real repo state passes cleanly" 0 "$actual"

# --- Test 2: actual_suds -> peak_suds rename does NOT false-positive ----
TMP2=$(mktemp -d)
mkdir -p "$TMP2/migrations"
cat > "$TMP2/schema.ts" <<'EOF'
const fear_ladder_items = new Table({
  peak_suds: column.integer,
})
EOF
cat > "$TMP2/migrations/0013_fear_ladder_items.sql" <<'EOF'
CREATE TABLE IF NOT EXISTS public.fear_ladder_items (
  actual_suds INT
);
EOF
cat > "$TMP2/migrations/0015_rename.sql" <<'EOF'
ALTER TABLE public.fear_ladder_items RENAME COLUMN actual_suds TO peak_suds;
EOF
set +e
SCHEMA_FILE="$TMP2/schema.ts" MIGRATIONS_DIR="$TMP2/migrations" bash "$GATE" >/tmp/t2.out 2>&1
actual=$?
set -e
assert_exit "rename fixture (with 0015 migration present) passes via RENAMES map" 0 "$actual"

# --- Test 2b: removing the rename migration proves the RENAMES map is load-bearing
rm "$TMP2/migrations/0015_rename.sql"
set +e
SCHEMA_FILE="$TMP2/schema.ts" MIGRATIONS_DIR="$TMP2/migrations" bash "$GATE" >/tmp/t2b.out 2>&1
actual=$?
set -e
assert_exit "rename fixture (0015 migration removed) correctly FAILS — proves RENAMES verification isn't a no-op" 1 "$actual"
rm -rf "$TMP2"

# --- Test 3: synthetic drift (untracked table/column) correctly FAILS ---
TMP3=$(mktemp -d)
mkdir -p "$TMP3/migrations"
cat > "$TMP3/schema.ts" <<'EOF'
const ghost_table = new Table({
  ghost_column: column.text,
})
EOF
: > "$TMP3/migrations/0001_unrelated.sql"
set +e
SCHEMA_FILE="$TMP3/schema.ts" MIGRATIONS_DIR="$TMP3/migrations" bash "$GATE" >/tmp/t3.out 2>&1
actual=$?
set -e
assert_exit "synthetic drift fixture (ghost_table) correctly FAILS" 1 "$actual"
grep -q "ghost_table" /tmp/t3.out || { echo "FAIL: drift output does not name 'ghost_table'"; FAILED=1; }
rm -rf "$TMP3"

if [[ "$FAILED" -eq 1 ]]; then
  echo "--- one or more fixture assertions failed ---"
  exit 1
fi
echo "--- all verify-schema-drift fixture assertions passed ---"
