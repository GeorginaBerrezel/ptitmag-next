-- Ligne ajoutée par l'admin en « À clôturer » (+ Produit)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS added_at_closure boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN order_items.added_at_closure IS
  'True si la ligne a été ajoutée par l''admin via + Produit (À clôturer).';
