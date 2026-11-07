-- Deuxième carton du même produit, seulement quand le premier est complet (ready).
-- Un seul carton ouvert, reporté ou en cours de commande à la fois.
-- Un carton reporté (deferred) ne reçoit plus de part : les commandes sont fermées.
-- Ne pas exécuter sur Supabase sans accord : prod et préprod partagent la même base.

DROP INDEX IF EXISTS share_pools_one_active_per_product;
CREATE UNIQUE INDEX share_pools_one_active_per_product
  ON share_pools (product_id)
  WHERE status IN ('open', 'deferred', 'settling');

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

  -- Un carton complet (ready) ne bloque plus : on n’y entre pas, on ouvre le suivant.
  -- Un carton reporté ne reçoit plus de part.
  SELECT * INTO v_pool
  FROM share_pools
  WHERE product_id = p_product_id
    AND status = 'open'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND AND EXISTS (
    SELECT 1
    FROM share_pools
    WHERE product_id = p_product_id
      AND status = 'deferred'
  ) THEN
    RAISE EXCEPTION 'supplier_closed';
  END IF;

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

NOTIFY pgrst, 'reload schema';
