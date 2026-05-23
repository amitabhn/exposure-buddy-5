// Conflict resolution stub — server wins (Epic 6 hardening)
// Full CRDT-style resolution deferred to Epic 6.
export function resolveConflict(_local: unknown, _remote: unknown): unknown {
  return _remote
}
