-- Snapshot qté / prix avant 1er edit admin en « À clôturer » (rétablir la ligne livrée)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS closure_baseline_quantity numeric,
  ADD COLUMN IF NOT EXISTS closure_baseline_unit_price numeric;

COMMENT ON COLUMN order_items.closure_baseline_quantity IS
  'Qté au moment du 1er edit admin (commande livrée) — référence pour Rétablir.';

COMMENT ON COLUMN order_items.closure_baseline_unit_price IS
  'Prix unitaire au moment du 1er edit admin — référence pour Rétablir (pas le catalogue brut).';
