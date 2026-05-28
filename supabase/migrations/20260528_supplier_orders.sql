-- Phase 2 : Joel ouvre/ferme les commandes par fournisseur
-- À exécuter dans Supabase → SQL Editor

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS orders_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_deadline timestamptz;

COMMENT ON COLUMN suppliers.orders_open IS 'Commandes activées manuellement par Joel';
COMMENT ON COLUMN suppliers.order_deadline IS 'Délai max de commande (requis quand orders_open = true)';
