-- =============================================================================
-- Vider TOUTES les commandes (preprod + prod — même base Supabase)
-- À n'utiliser que si 100 % des commandes sont des tests (validé juin 2026).
-- Ne touche PAS : produits, fournisseurs, membres, profils, avoirs, images.
-- =============================================================================

-- ÉTAPE 1 — Vérifier (lecture seule) — Run séparément
SELECT status, COUNT(*) AS nb
FROM orders
GROUP BY status
ORDER BY status;

SELECT COUNT(*) AS total_commandes FROM orders;
SELECT COUNT(*) AS total_lignes FROM order_items;

-- ÉTAPE 2 — Vérifier les avoirs sur les profils (lecture seule)
SELECT email, credit_balance, status
FROM profiles
WHERE credit_balance > 0
ORDER BY credit_balance DESC;

-- ÉTAPE 3 — Suppression (Run UNE fois si les chiffres te conviennent)
BEGIN;

DELETE FROM order_items;
DELETE FROM orders;

COMMIT;

-- ÉTAPE 4 — Contrôle après coup (doit afficher 0)
SELECT COUNT(*) AS commandes_restantes FROM orders;
SELECT COUNT(*) AS lignes_restantes FROM order_items;

-- ÉTAPE 5 — Admin site : Commandes doit être vide ; Membres / Catalogue inchangés.
