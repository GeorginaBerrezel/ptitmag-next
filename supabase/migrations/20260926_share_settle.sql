-- Partages : commande automatique à la date fournisseur.
-- Report = prochaine ouverture du fournisseur, pas +7 jours.
-- Ne pas exécuter sur Supabase sans accord (prod et preprod partagent la même base).
--
-- Vide les cartons encore ouverts (En attente + Complets).
-- Les commandes déjà passées dans « Commandes » restent. Seuls les partages en cours partent.

DELETE FROM share_pools
WHERE status IN ('open', 'ready');

ALTER TABLE share_pools DROP CONSTRAINT IF EXISTS share_pools_status_check;
ALTER TABLE share_pools ADD CONSTRAINT share_pools_status_check
  CHECK (status IN ('open', 'ready', 'deferred', 'settling', 'closed'));

ALTER TABLE share_pools
  ADD COLUMN IF NOT EXISTS notice text;

ALTER TABLE share_contributions
  ADD COLUMN IF NOT EXISTS cover_max numeric,
  ADD COLUMN IF NOT EXISTS cover_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_quantity numeric,
  ADD COLUMN IF NOT EXISTS order_id uuid;

UPDATE share_contributions
SET requested_quantity = quantity
WHERE requested_quantity IS NULL;

DROP INDEX IF EXISTS share_pools_one_active_per_product;
CREATE UNIQUE INDEX share_pools_one_active_per_product
  ON share_pools (product_id)
  WHERE status IN ('open', 'ready', 'deferred', 'settling');

DROP POLICY IF EXISTS share_pools_select ON share_pools;
CREATE POLICY share_pools_select ON share_pools
  FOR SELECT TO authenticated
  USING (
    status IN ('open', 'ready', 'deferred')
    AND EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND pr.status IN ('ciel', 'terre', 'member')
    )
  );

DROP POLICY IF EXISTS share_contrib_select ON share_contributions;
CREATE POLICY share_contrib_select ON share_contributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM share_pools p
      WHERE p.id = share_contributions.pool_id
        AND p.status IN ('open', 'ready', 'deferred')
    )
    AND EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND pr.status IN ('ciel', 'terre', 'member')
    )
  );

-- Le report n’est plus un +7 jours. La décision est dans l’application.
CREATE OR REPLACE FUNCTION share_apply_deadlines()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('cancelled', 0, 'rolled', 0);
END;
$$;

CREATE OR REPLACE FUNCTION share_join(
  p_member_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_if_incomplete text DEFAULT 'rollover',
  p_image_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool share_pools%ROWTYPE;
  v_target numeric;
  v_step numeric;
  v_filled numeric;
  v_already numeric;
  v_room numeric;
  v_qty numeric;
  v_policy text;
  v_existed boolean := false;
  v_name text;
  v_supplier_id uuid;
  v_supplier_name text;
  v_supplier_type text;
  v_supplier_ref text;
  v_unit text;
  v_unit_price numeric;
  v_min numeric;
  v_partial boolean;
  v_deadline timestamptz;
  v_orders_open boolean;
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT share_is_catalog_member(p_member_id) THEN
    RAISE EXCEPTION 'not_catalog_member';
  END IF;

  PERFORM share_apply_deadlines();

  v_policy := CASE
    WHEN p_if_incomplete IN ('rollover', 'cancel') THEN p_if_incomplete
    ELSE 'rollover'
  END;

  SELECT * INTO v_pool
  FROM share_pools
  WHERE product_id = p_product_id
    AND status IN ('open', 'ready', 'deferred')
  FOR UPDATE;

  IF FOUND THEN
    v_existed := true;
    v_target := v_pool.share_target;
    v_step := v_pool.share_step;
  ELSE
    SELECT
      p.name,
      p.supplier_id,
      COALESCE(s.name, 'Fournisseur'),
      s.type,
      p.supplier_ref,
      p.unit,
      p.unit_price,
      p.min_quantity,
      p.allows_partial_order,
      s.order_deadline,
      s.orders_open
    INTO
      v_name,
      v_supplier_id,
      v_supplier_name,
      v_supplier_type,
      v_supplier_ref,
      v_unit,
      v_unit_price,
      v_min,
      v_partial,
      v_deadline,
      v_orders_open
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.id = p_product_id
      AND p.active = true;

    IF v_name IS NULL OR v_unit_price IS NULL THEN
      RAISE EXCEPTION 'product_missing';
    END IF;

    IF NOT COALESCE(v_orders_open, false) OR v_deadline IS NULL OR v_deadline <= now() THEN
      RAISE EXCEPTION 'supplier_closed';
    END IF;

    SELECT sp.target, sp.step INTO v_target, v_step
    FROM share_plan(v_min, v_unit) sp;

    IF v_target IS NULL OR v_step IS NULL OR v_target <= 0 OR v_step <= 0 THEN
      RAISE EXCEPTION 'not_shareable';
    END IF;

    IF p_quantity >= v_target - 1e-9 THEN
      RAISE EXCEPTION 'whole_carton';
    END IF;

    INSERT INTO share_pools (
      product_id, product_name, supplier_id, supplier_name, supplier_type, supplier_ref,
      unit, unit_price, min_quantity, allows_partial_order,
      share_target, share_step, image_url, if_incomplete, status, deadline_at
    ) VALUES (
      p_product_id,
      v_name,
      v_supplier_id,
      v_supplier_name,
      v_supplier_type,
      v_supplier_ref,
      COALESCE(v_unit, 'pièce'),
      v_unit_price,
      v_min,
      COALESCE(v_partial, false),
      v_target,
      v_step,
      NULLIF(p_image_url, ''),
      v_policy,
      'open',
      v_deadline
    )
    RETURNING * INTO v_pool;
  END IF;

  IF share_pool_has_order(v_pool.id) THEN
    RAISE EXCEPTION 'pool_ordering';
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_filled
  FROM share_contributions
  WHERE pool_id = v_pool.id;

  SELECT COALESCE(quantity, 0) INTO v_already
  FROM share_contributions
  WHERE pool_id = v_pool.id AND member_id = p_member_id;

  v_room := v_target - (v_filled - v_already);
  IF v_room <= 1e-9 THEN
    RAISE EXCEPTION 'no_room';
  END IF;

  v_qty := LEAST(COALESCE(p_quantity, 0), v_room);
  v_qty := FLOOR((v_qty + 1e-9) / v_step) * v_step;
  IF v_qty < v_step - 1e-9 THEN
    RAISE EXCEPTION 'too_small';
  END IF;

  INSERT INTO share_contributions (pool_id, member_id, quantity, requested_quantity)
  VALUES (v_pool.id, p_member_id, v_qty, v_qty)
  ON CONFLICT (pool_id, member_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    requested_quantity = EXCLUDED.quantity,
    cover_max = CASE
      WHEN share_contributions.cover_max IS NOT NULL
        AND share_contributions.cover_max + 1e-9 < EXCLUDED.quantity
      THEN NULL
      ELSE share_contributions.cover_max
    END,
    cover_at = CASE
      WHEN share_contributions.cover_max IS NOT NULL
        AND share_contributions.cover_max + 1e-9 < EXCLUDED.quantity
      THEN NULL
      ELSE share_contributions.cover_at
    END,
    updated_at = now();

  SELECT COALESCE(SUM(quantity), 0) INTO v_filled
  FROM share_contributions
  WHERE pool_id = v_pool.id;

  UPDATE share_pools
  SET
    status = CASE
      WHEN v_pool.status = 'deferred' THEN 'deferred'
      WHEN v_filled >= v_target - 1e-9 THEN 'ready'
      ELSE 'open'
    END,
    updated_at = now()
  WHERE id = v_pool.id;

  RETURN jsonb_build_object(
    'poolId', v_pool.id,
    'quantity', v_qty,
    'filled', v_filled,
    'joinedExisting', v_existed AND v_already = 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION share_leave(p_member_id uuid, p_pool_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_left int;
  v_target numeric;
  v_filled numeric;
  v_status text;
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT share_is_catalog_member(p_member_id) THEN
    RAISE EXCEPTION 'not_catalog_member';
  END IF;

  PERFORM share_apply_deadlines();

  SELECT status INTO v_status
  FROM share_pools
  WHERE id = p_pool_id AND status IN ('open', 'ready', 'deferred')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pool_missing';
  END IF;
  IF share_pool_has_order(p_pool_id) THEN
    RAISE EXCEPTION 'pool_ordering';
  END IF;

  DELETE FROM share_contributions
  WHERE pool_id = p_pool_id AND member_id = p_member_id;

  SELECT COUNT(*) INTO v_left FROM share_contributions WHERE pool_id = p_pool_id;
  IF v_left = 0 THEN
    DELETE FROM share_pools WHERE id = p_pool_id;
    RETURN jsonb_build_object('removed', true, 'empty', true);
  END IF;

  SELECT share_target INTO v_target FROM share_pools WHERE id = p_pool_id;
  SELECT COALESCE(SUM(quantity), 0) INTO v_filled
  FROM share_contributions WHERE pool_id = p_pool_id;

  UPDATE share_pools
  SET
    status = CASE
      WHEN v_status = 'deferred' THEN 'deferred'
      WHEN v_filled >= v_target - 1e-9 THEN 'ready'
      ELSE 'open'
    END,
    updated_at = now()
  WHERE id = p_pool_id;

  RETURN jsonb_build_object('removed', true, 'empty', false);
END;
$$;

CREATE OR REPLACE FUNCTION share_claim_settle(p_pool_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM share_pools
  WHERE id = p_pool_id
  FOR UPDATE;

  IF v_status IS NULL OR v_status NOT IN ('open', 'ready') THEN
    RETURN false;
  END IF;

  UPDATE share_pools
  SET status = 'settling', updated_at = now()
  WHERE id = p_pool_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION share_abort_settle(p_pool_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target numeric;
  v_filled numeric;
BEGIN
  SELECT share_target INTO v_target
  FROM share_pools
  WHERE id = p_pool_id AND status = 'settling'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_filled
  FROM share_contributions
  WHERE pool_id = p_pool_id;

  UPDATE share_pools
  SET
    status = CASE WHEN v_filled >= v_target - 1e-9 THEN 'ready' ELSE 'open' END,
    updated_at = now()
  WHERE id = p_pool_id;
END;
$$;

REVOKE ALL ON FUNCTION share_claim_settle(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_abort_settle(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION share_claim_settle(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION share_abort_settle(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
