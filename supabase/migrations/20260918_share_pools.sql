-- Partages de lots (membres).
-- Même BDD test + prod. Porté depuis Envie locale — lot 3, sept. 2026.
-- Ne pas exécuter sur Supabase sans accord (prod et preprod partagent la même base).
-- Les RPC ne sont appelables que par le serveur (service_role), pas par un membre connecté.

CREATE TABLE IF NOT EXISTS share_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  supplier_type text,
  supplier_ref text,
  unit text NOT NULL,
  unit_price numeric NOT NULL,
  min_quantity numeric NOT NULL,
  allows_partial_order boolean NOT NULL DEFAULT false,
  share_target numeric NOT NULL CHECK (share_target > 0),
  share_step numeric NOT NULL CHECK (share_step > 0),
  image_url text,
  if_incomplete text NOT NULL DEFAULT 'rollover'
    CHECK (if_incomplete IN ('rollover', 'cancel')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'ready', 'closed')),
  deadline_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table déjà créée (ancienne version) : ajouter les colonnes avant les index.
ALTER TABLE share_pools
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');

CREATE UNIQUE INDEX IF NOT EXISTS share_pools_one_active_per_product
  ON share_pools (product_id)
  WHERE status IN ('open', 'ready');

CREATE INDEX IF NOT EXISTS share_pools_status_idx ON share_pools (status);
CREATE INDEX IF NOT EXISTS share_pools_open_deadline_idx
  ON share_pools (deadline_at)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS share_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES share_pools(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity numeric NOT NULL CHECK (quantity > 0),
  ordered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pool_id, member_id)
);

ALTER TABLE share_contributions
  ADD COLUMN IF NOT EXISTS ordered_at timestamptz;

CREATE INDEX IF NOT EXISTS share_contributions_pool_id_idx ON share_contributions (pool_id);
CREATE INDEX IF NOT EXISTS share_contributions_member_id_idx ON share_contributions (member_id);

COMMENT ON TABLE share_pools IS 'Carton partagé en cours (ouvert ou complet). Pas une commande.';
COMMENT ON TABLE share_contributions IS 'Part d’un membre dans un carton partagé.';

ALTER TABLE share_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_pools_select ON share_pools;
CREATE POLICY share_pools_select ON share_pools
  FOR SELECT TO authenticated
  USING (
    status IN ('open', 'ready')
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
        AND p.status IN ('open', 'ready')
    )
    AND EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND pr.status IN ('ciel', 'terre', 'member')
    )
  );

CREATE OR REPLACE FUNCTION share_member_label(p_member_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(trim(pr.first_name), ''),
    NULLIF(split_part(trim(COALESCE(pr.full_name, '')), ' ', 1), ''),
    'Membre'
  )
  FROM profiles pr
  WHERE pr.id = p_member_id;
$$;

-- Aligné sur lib/sharing/eligibility.ts (getSharePlan / parseBulkPack).
CREATE OR REPLACE FUNCTION share_plan(p_min numeric, p_unit text)
RETURNS TABLE(target numeric, step numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  u text := COALESCE(p_unit, '');
  n numeric;
  m text[];
BEGIN
  IF p_min IS NULL OR p_min <= 0 THEN
    RETURN;
  END IF;

  IF p_min >= 2 THEN
    target := p_min;
    step := CASE WHEN p_min = trunc(p_min) THEN 1 ELSE 0.5 END;
    RETURN NEXT;
    RETURN;
  END IF;

  m := regexp_match(u, '([0-9]+)[[:space:]]*[x×]', 'i');
  IF m IS NOT NULL THEN
    n := m[1]::numeric;
    IF n >= 2 THEN
      target := n;
      step := 1;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF u ~* 'sac|seau|meule|pièce|piece|bloc|pointe|bidon' THEN
    m := regexp_match(u, '([0-9]+(?:[.,][0-9]+)?)[[:space:]]*kg([^[:alnum:]]|$)', 'i');
    IF m IS NOT NULL THEN
      n := replace(m[1], ',', '.')::numeric;
      IF n >= 1.5 THEN
        target := n;
        step := 0.5;
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;
  END IF;

  IF u ~* 'bag[[:space:]]*in[[:space:]]*box|bib|bidon|seau' THEN
    m := regexp_match(u, '([0-9]+(?:[.,][0-9]+)?)[[:space:]]*l([^[:alnum:]]|$)', 'i');
    IF m IS NOT NULL THEN
      n := replace(m[1], ',', '.')::numeric;
      IF n >= 2 THEN
        target := n;
        step := CASE WHEN n >= 5 THEN 0.5 ELSE 1 END;
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION share_is_catalog_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_member_id
      AND status IN ('ciel', 'terre', 'member')
  );
$$;

CREATE OR REPLACE FUNCTION share_pool_has_order(p_pool_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM share_contributions
    WHERE pool_id = p_pool_id AND ordered_at IS NOT NULL
  );
$$;

-- Cartons incomplets : à l’heure limite, report (+7 jours) ou fermeture.
CREATE OR REPLACE FUNCTION share_apply_deadlines()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r share_pools%ROWTYPE;
  v_next timestamptz;
  v_cancelled int := 0;
  v_rolled int := 0;
  v_guard int;
BEGIN
  FOR r IN
    SELECT * FROM share_pools
    WHERE status = 'open' AND deadline_at <= now()
    FOR UPDATE
  LOOP
    IF r.if_incomplete = 'cancel' THEN
      UPDATE share_pools
      SET status = 'closed', updated_at = now()
      WHERE id = r.id;
      v_cancelled := v_cancelled + 1;
    ELSE
      v_next := r.deadline_at;
      v_guard := 0;
      WHILE v_next <= now() AND v_guard < 52 LOOP
        v_next := v_next + interval '7 days';
        v_guard := v_guard + 1;
      END LOOP;
      UPDATE share_pools
      SET deadline_at = v_next, updated_at = now()
      WHERE id = r.id;
      v_rolled := v_rolled + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('cancelled', v_cancelled, 'rolled', v_rolled);
END;
$$;

DROP FUNCTION IF EXISTS share_join(jsonb, numeric, text);
DROP FUNCTION IF EXISTS share_leave(uuid);
DROP FUNCTION IF EXISTS share_set_policy(uuid, text);

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
    AND status IN ('open', 'ready')
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
      s.order_deadline
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
      v_deadline
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.id = p_product_id
      AND p.active = true;

    IF v_name IS NULL OR v_unit_price IS NULL THEN
      RAISE EXCEPTION 'product_missing';
    END IF;

    IF v_deadline IS NULL OR v_deadline <= now() THEN
      v_deadline := now() + interval '7 days';
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

  INSERT INTO share_contributions (pool_id, member_id, quantity)
  VALUES (v_pool.id, p_member_id, v_qty)
  ON CONFLICT (pool_id, member_id)
  DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now();

  SELECT COALESCE(SUM(quantity), 0) INTO v_filled
  FROM share_contributions
  WHERE pool_id = v_pool.id;

  UPDATE share_pools
  SET
    status = CASE WHEN v_filled >= v_target - 1e-9 THEN 'ready' ELSE 'open' END,
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
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT share_is_catalog_member(p_member_id) THEN
    RAISE EXCEPTION 'not_catalog_member';
  END IF;

  PERFORM share_apply_deadlines();

  PERFORM 1 FROM share_pools WHERE id = p_pool_id AND status IN ('open', 'ready') FOR UPDATE;
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
    status = CASE WHEN v_filled >= v_target - 1e-9 THEN 'ready' ELSE 'open' END,
    updated_at = now()
  WHERE id = p_pool_id;

  RETURN jsonb_build_object('removed', true, 'empty', false);
END;
$$;

CREATE OR REPLACE FUNCTION share_set_policy(p_member_id uuid, p_pool_id uuid, p_if_incomplete text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT share_is_catalog_member(p_member_id) THEN
    RAISE EXCEPTION 'not_catalog_member';
  END IF;
  PERFORM share_apply_deadlines();
  IF p_if_incomplete NOT IN ('rollover', 'cancel') THEN
    RAISE EXCEPTION 'invalid_policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM share_contributions
    WHERE pool_id = p_pool_id AND member_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'not_in_pool';
  END IF;
  IF share_pool_has_order(p_pool_id) THEN
    RAISE EXCEPTION 'pool_ordering';
  END IF;

  UPDATE share_pools
  SET if_incomplete = p_if_incomplete, updated_at = now()
  WHERE id = p_pool_id AND status IN ('open', 'ready');
END;
$$;

CREATE OR REPLACE FUNCTION share_mark_ordered(p_member_id uuid, p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool share_pools%ROWTYPE;
  v_pending int;
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT share_is_catalog_member(p_member_id) THEN
    RAISE EXCEPTION 'not_catalog_member';
  END IF;

  SELECT * INTO v_pool
  FROM share_pools
  WHERE product_id = p_product_id
    AND status = 'ready'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pool_missing';
  END IF;

  UPDATE share_contributions
  SET ordered_at = now(), updated_at = now()
  WHERE pool_id = v_pool.id
    AND member_id = p_member_id
    AND ordered_at IS NULL;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM share_contributions
      WHERE pool_id = v_pool.id
        AND member_id = p_member_id
        AND ordered_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'already_ordered';
    END IF;
    RAISE EXCEPTION 'not_in_pool';
  END IF;

  SELECT COUNT(*) INTO v_pending
  FROM share_contributions
  WHERE pool_id = v_pool.id AND ordered_at IS NULL;

  IF v_pending = 0 THEN
    UPDATE share_pools
    SET status = 'closed', updated_at = now()
    WHERE id = v_pool.id;
  END IF;

  RETURN jsonb_build_object(
    'poolId', v_pool.id,
    'closed', v_pending = 0
  );
END;
$$;

GRANT SELECT ON share_pools TO authenticated;
GRANT SELECT ON share_contributions TO authenticated;

REVOKE ALL ON FUNCTION share_plan(numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_is_catalog_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_pool_has_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_apply_deadlines() FROM PUBLIC;
REVOKE ALL ON FUNCTION share_join(uuid, uuid, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_leave(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_set_policy(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION share_mark_ordered(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION share_apply_deadlines() TO service_role;
GRANT EXECUTE ON FUNCTION share_join(uuid, uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION share_leave(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION share_set_policy(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION share_mark_ordered(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
