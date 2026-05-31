-- Retrait d'un produit d'une commande (admin) — ligne conservée pour l'historique
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL;

COMMENT ON COLUMN order_items.cancelled_at IS
  'Renseigné quand Joel retire un produit indisponible ; la ligne reste en base mais est exclue du total.';
