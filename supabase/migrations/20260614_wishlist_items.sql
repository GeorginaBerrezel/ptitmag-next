-- Wishlist « Mes favoris » — un membre peut marquer des produits en favori.

CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlist_items_member_id_idx ON wishlist_items (member_id);

COMMENT ON TABLE wishlist_items IS 'Produits favoris par membre (wishlist).';

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY wishlist_select_own ON wishlist_items
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY wishlist_insert_own ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY wishlist_delete_own ON wishlist_items
  FOR DELETE USING (auth.uid() = member_id);

-- Marqueur : remplissage auto depuis l'historique commandes (une seule fois par membre).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wishlist_seeded_at timestamptz;

COMMENT ON COLUMN profiles.wishlist_seeded_at IS
  'Date du remplissage auto des favoris depuis commandes livrées/clôturées (max 50 produits).';
