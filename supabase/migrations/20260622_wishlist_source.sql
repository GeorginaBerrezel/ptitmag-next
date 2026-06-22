-- Favoris : distinguer choix manuel (♥) et import auto historique (legacy).

ALTER TABLE wishlist_items
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'seed'));

COMMENT ON COLUMN wishlist_items.source IS
  'manual = cœur membre ; seed = import auto historique (1ère visite, legacy).';

-- Rétro : marquer les lignes créées lors du remplissage auto (sans toucher les ♥ ajoutés après).
UPDATE wishlist_items wi
SET source = 'seed'
FROM profiles p
WHERE wi.member_id = p.id
  AND p.wishlist_seeded_at IS NOT NULL
  AND wi.source = 'manual'
  AND wi.created_at <= p.wishlist_seeded_at + interval '5 minutes';
