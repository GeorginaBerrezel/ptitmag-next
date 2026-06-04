# Le P'tit Mag — Compte rendu complet

**Site en production :** [www.leptitmag.org](https://www.leptitmag.org)  
**Domaine :** Infomaniak · **Déploiement :** Vercel · **Données :** Supabase · **Code :** GitHub privé `ptitmag-next`  
**Préprod (en cours) :** preprod.leptitmag.org · branche `staging`  
**Date :** mai 2026  
**Pour :** Joel & l'association Le P'tit Mag · Georgina Berrezel

> **Guide simplifié pour Joel :** [guide-joel.md](./guide-joel.md) (5 min, sans jargon technique)  
> **Hébergement, préprod, domaine :** [hebergement-et-deploiement.md](./hebergement-et-deploiement.md)  
> **Grille tarifaire prospects :** [grille-tarifaire.md](./grille-tarifaire.md)

---

## 1. Message court pour Joel

Le site est **livré, en ligne et fonctionnel**. Tout le plan convenu lors de l'entretien initial a été implémenté. Les améliorations demandées ensuite (mobile, cotisations, suppression de compte, session du 28 mai) sont **déployées en production**.

**Ton compte admin :** `info@leptitmag.org` — accès complet.

**À faire de ton côté :** te connecter une fois pour valider que tout fonctionne (mot de passe ou « mot de passe oublié »).

**Routine hebdo :** emails de commande → export CSV → marquer Livrée/Annulée → ouvrir/fermer les commandes par fournisseur → imports quand Georgina prépare les fichiers.

**Coût infra aujourd'hui :** ~0 CHF/mois (Supabase + Vercel gratuits).

→ Détails, liens et pas-à-pas : **[guide-joel.md](./guide-joel.md)**

---

## 2. Plan initial — les 7 étapes (entretien)

| # | Sujet | Statut | Détail |
|---|-------|--------|--------|
| 1 | Auth (mot de passe visible, reset, emails prod) | ✅ Livré | Pages mot de passe oublié / réinitialisation, liens email prod |
| 2 | Deadlines — fournisseurs restent visibles | ✅ Livré | Deadline passée = informatif, panier désactivé si commandes fermées |
| 3 | Filtres, tri catégorie, recherche | ✅ Livré | Navigation Fournisseur → Catégorie → Produits, recherche sans accents |
| 4 | Performance (~2 000 produits) | ✅ Livré | Chargement à la demande, APIs dédiées, affichage progressif |
| 5 | Droits admin Joel | ✅ Livré | `info@leptitmag.org` = accès complet admin |
| 6 | Cotisations | ✅ Livré | Montants admin, totaux, graphiques, retrait « essai 3 mois » |
| 7 | Suppression de compte | ✅ Livré | Zone sensible Mon compte, confirmation « SUPPRIMER » |
| + | UX mobile | ✅ Livré | Cartes produits, heroes lisibles, scroll en haut de page corrigé |

**En attente de validation Joel :** connexion admin avec son propre mot de passe.

---

## 3. Session Joel du 28 mai 2026 — 6 phases

Toutes implémentées et déployées (vérifiées dans le code source).

### Phase 1 — Prix +20 % pour les non cotisés

| Membre | Prix affiché |
|--------|----------------|
| **Non cotisé** | Prix catalogue × **1,20** (+20 %) |
| **Cotisé** | Prix catalogue **sans** marge |
| **Biopartner sous quantité minimum (UC)** | **+10 %** en plus (cumul possible avec +20 %) |

- Badge **« +20 % »** sur les produits, mention dans **Mon compte** et au panier
- Recalcul **côté serveur** à la commande (`lib/catalog/pricing.ts`)

### Phase 2 — Joel ouvre / ferme les commandes (par fournisseur)

| Élément | Comportement |
|---------|----------------|
| **Catalogue** | Toujours visible (si fournisseur actif) |
| **Commander** | Seulement si Joel active **« Commandes ouvertes »** |
| **Délai max** | Obligatoire quand les commandes sont ouvertes |
| **Délai dépassé** | Fermeture automatique (plus de panier) |

**Où :** Admin → **Fournisseurs** → toggles + date/heure limite.

> **Migration SQL :** `supabase/migrations/20260528_supplier_orders.sql`

### Phase 3 — Masquer un produit (producteurs locaux)

**Où :** Admin → Fournisseurs → **Produits ▾** (locaux uniquement — pas Biopartner).

- **Masquer** = invisible pour les membres, conservé en base
- **Afficher** = réapparaît dans le catalogue

**Biopartner :** gestion via **import CSV** (produits absents du fichier retirés de ce catalogue).

### Phase 4 — Quatre catalogues Biopartner

1. Biopartner – Général  
2. Biopartner – Grands emballages  
3. Biopartner – Surgelés  
4. Biopartner – Viandes fraîches  

- 4 cartes catalogue · 4 imports séparés · délais indépendants
- Outil **« Découper en 4 CSV »** (Admin → Import)
- L'ancien fournisseur « Biopartner » unique est **masqué** (données historiques — ne pas réactiver)

> **Migration SQL :** `supabase/migrations/20260528_biopartner_catalogs.sql`

### Phase 5 — Imports locaux incrémentaux

Mise à jour des prix + ajout des nouveaux produits. Un produit absent du fichier **reste visible** → Joel le masque manuellement si besoin.

### Phase 6 — Catalogue Biopartner (navigation & performance)

Navigation par **catégories** + **recherche** globale sur tout le catalogue.

---

## 4. Fonctionnalités livrées (détail)

### Site public (FR/EN)

Accueil, Adhésion, Producteurs, Contact — responsive · bilingue · Signal · Google Maps · horaires · produits éphémères (bandeau orange) · textes adhésion sans période d'essai.

### Espace adhérents

Inscription / connexion / reset mot de passe · catalogue fournisseurs → catégories → produits · recherche globale · panier multi-fournisseur · emails confirmation · Mon compte (profil, historique, cotisation) · suppression de compte · majoration +20 % visible.

### Espace admin

Tableau de bord (KPIs, graphiques cotisations) · Commandes (statuts, export CSV) · Membres (Non cotisé / Cotisé, montant CHF) · Fournisseurs (visibilité, commandes ouvertes, délai) · Import (Biopartner ×4, locaux, découpe CSV).

*Note technique : le statut en base s'appelle encore `trial` / `member` ; à l'écran Joel voit **Non cotisé** / **Cotisé**.*

### Emails

Confirmation de commande (adhérent + copie admin) · config prod via `NEXT_PUBLIC_SITE_URL` + Supabase.

### Règles Biopartner (conservées)

UM/UC · +10 % si quantité &lt; UC · import CSV désactive l'ancien catalogue du même type (~1 356 produits actifs).

---

## 5. Ce qui reste « plus tard » (non bloquant)

- Message email « lien expiré » alors que le compte fonctionne déjà (cosmétique)
- Vrais logos fournisseurs (emoji + description aujourd'hui)
- Préprod **preprod.leptitmag.org** — voir [hebergement-et-deploiement.md](./hebergement-et-deploiement.md)
- Migrations SQL prod — à confirmer si déjà exécutées (Phases 2 et 4)

---

## 6. Technique & infrastructure

| Composant | Rôle |
|-----------|------|
| **Next.js 16.0** | Frontend + API |
| **Supabase** | Auth, PostgreSQL, stockage avatars |
| **Vercel** | Hébergement, déploiement auto GitHub |
| **GitHub** | Code source privé |

**Capacité Supabase Free :** ~50 membres actifs aujourd'hui → marge jusqu'à ~300 membres / ~30 000 commandes/an sans changer de plan. Au-delà : Supabase Pro ~25 CHF/mois.

**Propriété :** code transféré à l'association après paiement intégral du devis · données exportables PostgreSQL.

---

## 7. Devis DEV-2026-001

| | |
|---|---|
| **Total** | CHF 3 200.– HT (TVA 0 % association) |
| **Paiement** | 40 % signature (1 280.–) + 60 % livraison (1 920.–) |
| **Statut** | Livré en production — devis = régularisation |
| **Positionnement** | ~43 % sous tarif marché suisse estimé (CHF 5 600–6 000) |

Maintenance optionnelle proposée : **120 CHF/mois**. Grille prospects : [grille-tarifaire.md](./grille-tarifaire.md).

---

## 8. Coûts récurrents

| Service | Coût |
|---------|------|
| Supabase Free | 0 CHF/mois |
| Vercel Hobby | 0 CHF/mois |
| Maintenance Georgina (optionnel) | 120 CHF/mois |
| Vercel Pro / Supabase Pro (si croissance) | ~20 / ~25 CHF/mois |

---

## 9. Actions recommandées (prochaines semaines)

| Priorité | Action | Qui |
|----------|--------|-----|
| 1 | Joel teste connexion admin | Joel |
| 2 | Régularisation devis / solde | Asso + Georgina |
| 3 | Confirmer migrations SQL prod (Phases 2 & 4) | Georgina |
| 4 | ~~Pointer **leptitmag.org** (DNS Infomaniak → Vercel)~~ | ✅ Fait (29 mai) |
| 5 | Mettre en place **preprod** (`preprod.leptitmag.org` + branche `staging`) | Georgina |
| 6 | Améliorations mineures (email, logos) | Quand besoin |

→ Détail étape par étape : [hebergement-et-deploiement.md](./hebergement-et-deploiement.md)

---

## 10. Historique des livraisons

| Période | Livrables |
|---------|-----------|
| Entretien initial | Plan 7 étapes validé |
| Phase dev 1–7 | Auth, deadlines, catalogue, perf, admin Joel, cotisations, suppression compte |
| Avril–mai 2026 | UX mobile, Biopartner UM/UC, nettoyage catalogue 10k→1,3k |
| 24 mai 2026 | Site livré en production |
| 28 mai — Phases 1–6 | +20 %, commandes Joel, masquage produit, 4 Biopartner, imports incrémentaux, nav catégories |
| Mai 2026 | Scroll mobile, sync statut cotisation après connexion |

---

*Document complet — ptitmag-next · mai 2026 · vérifié contre le code source*
