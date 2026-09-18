-- Panier lié au compte (téléphone / ordi).
-- Dernier enregistrement gagne. Porté depuis Envie locale — lot 1, sept. 2026.
-- Ne pas exécuter sur Supabase sans accord (prod et preprod partagent la même base).

CREATE TABLE IF NOT EXISTS member_carts (
  member_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE member_carts IS 'Panier du membre connecté. Un login = un panier, tous appareils.';

ALTER TABLE member_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_carts_select_own ON member_carts;
CREATE POLICY member_carts_select_own ON member_carts
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

DROP POLICY IF EXISTS member_carts_insert_own ON member_carts;
CREATE POLICY member_carts_insert_own ON member_carts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS member_carts_update_own ON member_carts;
CREATE POLICY member_carts_update_own ON member_carts
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

REVOKE ALL ON TABLE member_carts FROM PUBLIC;
REVOKE ALL ON TABLE member_carts FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE member_carts TO authenticated;
