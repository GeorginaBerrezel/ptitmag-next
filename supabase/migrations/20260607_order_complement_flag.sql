-- Commande créée lors d'un complément sur place (autre fournisseur).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS created_via_complement boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.created_via_complement IS 'True si la commande a été ouverte en mode complément (ajout magasin, autre fournisseur).';
