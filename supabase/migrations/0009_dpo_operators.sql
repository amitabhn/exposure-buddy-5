-- dpo_operators: DPO operator identities. id matches auth.users.id for JWT sub alignment. Managed via seeding only — no self-registration.
CREATE TABLE IF NOT EXISTS public.dpo_operators (
  id          UUID        PRIMARY KEY,
  email       TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
