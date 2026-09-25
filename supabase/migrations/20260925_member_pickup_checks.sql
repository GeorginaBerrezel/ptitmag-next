-- Coches « produit récupéré » liées au compte (téléphone / ordi).
-- Accord Georgina, 25 sept. 2026. Prod et preprod partagent la même base :
-- cette table est visible des deux dès qu'elle existe.

CREATE TABLE IF NOT EXISTS member_pickup_checks (
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, order_item_id)
);

COMMENT ON TABLE member_pickup_checks IS
  'Produits cochés comme récupérés. Un login = les mêmes coches sur tous les appareils.';

CREATE OR REPLACE FUNCTION member_owns_order_item(p_item uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = p_item
      AND o.member_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION member_owns_order_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION member_owns_order_item(uuid) TO authenticated;

ALTER TABLE member_pickup_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_pickup_checks_select_own ON member_pickup_checks;
CREATE POLICY member_pickup_checks_select_own ON member_pickup_checks
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

DROP POLICY IF EXISTS member_pickup_checks_insert_own ON member_pickup_checks;
CREATE POLICY member_pickup_checks_insert_own ON member_pickup_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = member_id
    AND member_owns_order_item(order_item_id)
  );

DROP POLICY IF EXISTS member_pickup_checks_delete_own ON member_pickup_checks;
CREATE POLICY member_pickup_checks_delete_own ON member_pickup_checks
  FOR DELETE TO authenticated
  USING (auth.uid() = member_id);

REVOKE ALL ON TABLE member_pickup_checks FROM PUBLIC;
REVOKE ALL ON TABLE member_pickup_checks FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE member_pickup_checks TO authenticated;
