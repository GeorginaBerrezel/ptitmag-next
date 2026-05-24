-- À exécuter dans Supabase → SQL Editor si la suppression de compte échoue
-- (conserve l'historique des commandes quand un membre supprime son compte)

ALTER TABLE orders ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_member_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE SET NULL;
