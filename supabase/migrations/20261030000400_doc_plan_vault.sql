-- DỌC opt-in shared plans. The bearer code is NEVER stored; only SHA-256 hex.
-- Data must only be accessed via a trusted server route using service_role.
CREATE TABLE IF NOT EXISTS public.doc_plan_vault (
    access_hash text PRIMARY KEY CHECK (access_hash ~ '^[0-9a-f]{64}$'),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
    CONSTRAINT doc_plan_vault_payload_max CHECK (octet_length(payload::text) <= 65536)
);
ALTER TABLE public.doc_plan_vault ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.doc_plan_vault FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.doc_plan_vault TO service_role;
CREATE INDEX IF NOT EXISTS doc_plan_vault_expiry_idx ON public.doc_plan_vault(expires_at);
-- Operator must schedule a deletion job after expiration. Reading API rejects expired rows even before cleanup.
