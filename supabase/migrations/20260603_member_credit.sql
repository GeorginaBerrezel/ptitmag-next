-- Avoir membre (CHF) : saisie admin, déduction à la commande.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credit_balance numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS credit_applied numeric(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.credit_balance IS 'Avoir disponible (CHF), saisi par admin.';
COMMENT ON COLUMN orders.credit_applied IS 'Montant d''avoir déduit sur cette commande (CHF).';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_credit_balance_nonneg CHECK (credit_balance >= 0);

ALTER TABLE orders
  ADD CONSTRAINT orders_credit_applied_nonneg CHECK (credit_applied >= 0);
