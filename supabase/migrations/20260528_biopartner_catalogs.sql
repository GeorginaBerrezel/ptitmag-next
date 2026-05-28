-- Phase 4 : quatre catalogues Biopartner + retrait de l'ancien fournisseur unique
-- À exécuter dans Supabase → SQL Editor (après déploiement du code)

-- Masquer l'ancien « Biopartner » monolithique (produits et fournisseur conservés en base)
UPDATE products
SET active = false
WHERE supplier_id IN (
  SELECT id FROM suppliers WHERE name = 'Biopartner'
);

UPDATE suppliers
SET active = false, orders_open = false
WHERE name = 'Biopartner';

-- Les 4 fournisseurs « Biopartner – … » sont créés automatiquement au premier import CSV.
