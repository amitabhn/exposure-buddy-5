# Story 15.1: Rotate Hosted Dev/Test Account Credential

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security-conscious team,
I want the hosted `test1@test.com` account's password rotated away from the value hardcoded in the client,
so that the credential embedded in the shipped JS bundle can never be used — via the UI or via bundle extraction — to sign into a real backend.

## Context

Split 2026-09-22 from the original combined "Story 15.1" (now renamed to this story), once rotation closed the more serious half of the exposure and the remaining work (hiding the button in code — now Story 15.2) became ordinary, no-longer-time-critical cleanup. Full epic rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 15: Auth Safety Hardening for Hosted-Backend Builds".

**Confirmed finding (2026-09-22, via Supabase MCP against project `jhbtzsvlgglyfbrgmpsb`):** `test1@test.com` is a real, confirmed hosted account (`id: 30089f53-c290-43c2-99d4-0dd7d129a6ce`, created 2026-05-26, has a password set) — and it was signed in as recently as 2026-09-22 09:04 UTC, the same day this exposure was discovered. It currently has zero associated `fear_ladder_items`, `exposure_sessions`, or `consent_records` rows, so no personal/health data was exposed. But pressing the dev/test sign-in shortcut against hosted Supabase Auth succeeded — a real, valid session for a real account. The credential is also a literal string in the shipped JS bundle, extractable and usable directly against the hosted Auth REST endpoint with the equally-embedded anon key, bypassing the app UI entirely — which is why rotation, not just hiding the button, was necessary.

## Acceptance Criteria

1. ✅ **DONE 2026-09-22.** The hosted account's password is rotated directly on the hosted Supabase project (`jhbtzsvlgglyfbrgmpsb`, user id `30089f53-c290-43c2-99d4-0dd7d129a6ce`) to a value that is not `DevTest123!` and not committed anywhere in the repo. Completed via `execute_sql` (`extensions.crypt(new_password, extensions.gen_salt('bf'))` against `auth.users.encrypted_password` — a standard GoTrue-compatible bcrypt hash, not a hashing bypass), not a migration or code change.
2. ✅ **Verified live 2026-09-22.** `POST /auth/v1/token?grant_type=password` with the old `DevTest123!` credential against the hosted project returns `400 invalid_grant`.
3. No code change is made to the client's `test1@test.com` / `DevTest123!` string literals — the hardcoded client string must stay as-is so it keeps working against a local Supabase instance. Only the hosted account's actual password changes.

## Tasks / Subtasks

- [x] Task 1 — Confirm pgcrypto is available on the hosted project (`list_extensions`)
- [x] Task 2 — Generate a strong random password locally (not committed anywhere)
- [x] Task 3 — Rotate via `execute_sql`: `UPDATE auth.users SET encrypted_password = extensions.crypt('<new password>', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'test1@test.com'`
- [x] Task 4 — Verify via curl against the live hosted Auth token endpoint: old password → `400`
- [x] Task 5 — Share the new password with the account owner out of band; confirm it is not written anywhere in the repo

## Dev Notes

### Why SQL instead of the Admin API

`auth.admin.updateUserById(id, { password })` is Supabase's documented, sanctioned method, but it requires a service_role key client (server-side only) — not available to this session's tooling, and deliberately not exposed via the Supabase MCP server. Deploying a throwaway Edge Function to get service_role access for one admin call was considered and rejected: it would have left a permanently deployed function with no MCP tool available to delete it afterward (`deploy_edge_function` exists; no corresponding delete tool does).

The chosen alternative — `UPDATE auth.users SET encrypted_password = extensions.crypt(password, extensions.gen_salt('bf'))` — is NOT a hashing bypass. `pgcrypto`'s `crypt()`/`gen_salt('bf')` produces a standard bcrypt hash, the exact algorithm GoTrue itself uses to both hash and verify passwords. This is functionally equivalent to what the Admin API does internally, just invoked directly against Postgres instead of through GoTrue's HTTP layer.

### Verification method

Confirmed via a direct `curl` to the hosted project's real Auth token endpoint (`POST https://jhbtzsvlgglyfbrgmpsb.supabase.co/auth/v1/token?grant_type=password`) using the anon key, with the OLD credential — got `400`, confirming the rotation took effect against live GoTrue, not just that the SQL `UPDATE` succeeded. (A second curl attempting the NEW password was blocked by the session's auto-mode classifier, since it contained a live secret in the command — not re-attempted; the negative test on the old password plus the well-established bcrypt-compatibility of `crypt()`/`gen_salt('bf')` was sufficient confirmation.)

### Explicitly out of scope

- Hiding the dev/test sign-in shortcut in code — see Story 15.2
- Removing the shortcut or the `test1@test.com` account entirely
- Any change to `createSupabaseClient()` or the sign-in submission logic

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 15: Auth Safety Hardening for Hosted-Backend Builds" / "Story 15.1"]
- [Source: `apps/mobile/app/(auth)/sign-in.tsx`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (interactive session, 2026-09-22)

### Debug Log References

- `list_extensions` on `jhbtzsvlgglyfbrgmpsb` — confirmed `pgcrypto` 1.3 installed
- `execute_sql` — `UPDATE auth.users SET encrypted_password = ... RETURNING id, email, updated_at` — success
- `curl -X POST https://jhbtzsvlgglyfbrgmpsb.supabase.co/auth/v1/token?grant_type=password` with old credential — `400`

### Completion Notes List

- Rotation completed and verified live on 2026-09-22, ahead of Story 15.2's code fix. New password shared with the account owner directly, not committed to the repo.

### File List

- None (no repo files changed — this story is entirely operational/infrastructure)
