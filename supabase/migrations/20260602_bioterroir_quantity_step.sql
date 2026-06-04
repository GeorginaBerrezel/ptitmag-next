-- Bioterroir : commandes au kg par tranches de 0,25 (catalogue + panier).
-- À exécuter dans le SQL Editor Supabase (base partagée prod/preprod).

UPDATE products p
SET min_quantity = 0.25
FROM suppliers s
WHERE p.supplier_id = s.id
  AND s.name = 'Bioterroir'
  AND lower(trim(p.unit)) IN ('kg', 'kilo', 'kilogramme')
  AND p.active = true;
