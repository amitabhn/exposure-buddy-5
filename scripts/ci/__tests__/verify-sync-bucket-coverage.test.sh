#!/usr/bin/env bash
# Story 9.1 Testing Requirements — fixture tests for scripts/ci/verify-sync-bucket-coverage.sh.
# Not wired into CI (the production gate is); run manually or ad hoc to regression-test
# the gate script itself: bash scripts/ci/__tests__/verify-sync-bucket-coverage.test.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/verify-sync-bucket-coverage.sh"
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

# --- Test 1: real repo state passes cleanly (confirms Task 1.3's bucket fix) ---
set +e
(cd "$REPO_ROOT" && bash "$GATE" >/tmp/b1.out 2>&1)
actual=$?
set -e
assert_exit "real repo state passes cleanly (post Task 1.3 bucket fix)" 0 "$actual"

# --- Test 2: synthetic fixture — table with no bucket and no exclusion FAILS ---
TMP2=$(mktemp -d)
cat > "$TMP2/schema.ts" <<'EOF'
const orphan_table = new Table({
  some_column: column.text,
})

export const AppSchema = new Schema({ orphan_table })
EOF
cat > "$TMP2/sync-rules.yaml" <<'EOF'
bucket_definitions:
  user_data:
    parameters: SELECT token_parameters.user_id AS user_id
    data:
      - SELECT id FROM public.unrelated_table WHERE user_id = bucket.user_id
EOF
set +e
SCHEMA_FILE="$TMP2/schema.ts" SYNC_RULES_FILE="$TMP2/sync-rules.yaml" bash "$GATE" >/tmp/b2.out 2>&1
actual=$?
set -e
assert_exit "synthetic fixture (orphan_table, no bucket/exclusion) correctly FAILS" 1 "$actual"
grep -q "orphan_table" /tmp/b2.out || { echo "FAIL: bucket-coverage output does not name 'orphan_table'"; FAILED=1; }
rm -rf "$TMP2"

# --- Test 3: synthetic fixture — documented exclusion comment is honoured -------
TMP3=$(mktemp -d)
cat > "$TMP3/schema.ts" <<'EOF'
const orphan_table = new Table({
  some_column: column.text,
})

export const AppSchema = new Schema({ orphan_table })
EOF
cat > "$TMP3/sync-rules.yaml" <<'EOF'
# orphan_table — excluded: intentionally write-only for this fixture test
bucket_definitions:
  user_data:
    parameters: SELECT token_parameters.user_id AS user_id
    data:
      - SELECT id FROM public.unrelated_table WHERE user_id = bucket.user_id
EOF
set +e
SCHEMA_FILE="$TMP3/schema.ts" SYNC_RULES_FILE="$TMP3/sync-rules.yaml" bash "$GATE" >/tmp/b3.out 2>&1
actual=$?
set -e
assert_exit "synthetic fixture with documented exclusion comment correctly PASSES" 0 "$actual"
rm -rf "$TMP3"

if [[ "$FAILED" -eq 1 ]]; then
  echo "--- one or more fixture assertions failed ---"
  exit 1
fi
echo "--- all verify-sync-bucket-coverage fixture assertions passed ---"
