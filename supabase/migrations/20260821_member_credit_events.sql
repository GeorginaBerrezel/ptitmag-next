-- Carnet d'avoir membre : chaque dépôt / correction / usage à la clôture
-- est une ligne. On n'écrase plus le solde sans trace.

CREATE TABLE IF NOT EXISTS member_credit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  balance_after numeric(10, 2) NOT NULL CHECK (balance_after >= 0),
  kind text NOT NULL CHECK (kind IN ('deposit', 'adjustment', 'order_close', 'order_restore')),
  note text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_credit_events_member_id_idx
  ON member_credit_events (member_id, created_at DESC);

COMMENT ON TABLE member_credit_events IS
  'Carnet avoir : dépôts magasin, corrections, usage à la clôture, recrédit si annulation.';
COMMENT ON COLUMN member_credit_events.amount IS
  'Montant signé (CHF). Positif = dépôt / recrédit. Négatif = usage / retrait.';
COMMENT ON COLUMN member_credit_events.kind IS
  'deposit | adjustment | order_close | order_restore';

ALTER TABLE member_credit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_credit_events_select_own ON member_credit_events
  FOR SELECT USING (auth.uid() = member_id);
