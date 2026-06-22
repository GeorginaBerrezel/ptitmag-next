# Handoff v2.0-e — Retirer un produit (admin commandes)

**Pour :** nouvelle session Cursor / Georgina  
**Client :** Joel Azoo · Le P'tit Mag · info@leptitmag.org  
**Mis à jour :** 22 juin 2026  
**Branche suggérée :** `feat/v2.0-e-retirer-produit`

---

## En une phrase

Joel retire **une ligne produit** d'une commande adhérent (rupture, indisponible) → **total recalculé** → **email au membre** → ligne invisible côté membre.

Ce n'est **pas** la case « J'ai récupéré ce produit » (v1.6, localStorage, sans impact métier).

---

## Contexte projet (rappel)

| Env | URL | Branche |
|-----|-----|---------|
| Prod | https://www.leptitmag.org | `main` |
| Preprod | https://preprod.leptitmag.org | `staging` |
| Dev | http://localhost:3000 | locale |

Stack : Next.js 16 · Supabase · Vercel · GitHub `GeorginaBerrezel/ptitmag-next`.

Workflow : `feat/…` → PR → `staging` → test preprod → PR → `main`.

**Ne pas** commit / push / merge sans « go » explicite de Georgina.

---

## Où en est le chantier v2.0 ?

| Sous-vague | Statut | Contenu |
|------------|--------|---------|
| v2.0-a | ✅ mergé | UI groupée par membre + emails groupés livraison/clôture |
| v2.0-b | ✅ mergé | Avoir déduit à la clôture groupée |
| v2.0-c | ✅ mergé | Ajout produit admin en « À clôturer » only |
| v2.0-d | ✅ mergé | Edit qté/prix à la clôture + baseline + rétablir |
| **v2.0-e** | 🔜 **à finaliser** | Retirer produit — périmètre strict + tests + polish |

---

## Ce que v2.0-e signifiait à l'origine

> Périmètre strict : **à clôturer**, **panier membre** admin+membre ; **pas** récap groupé fournisseur sauf modes **action** / **toClose**.

Traduction métier :

1. **Admin → Commandes → À traiter** (`confirmed`) : Joel peut retirer une ligne.
2. **Admin → Commandes → À clôturer** (`delivered`) : Joel peut retirer une ligne (y compris après edit qté/prix v2.0-d).
3. **Récap groupé fournisseur** (table verte quand un fournisseur est filtré) : retrait **uniquement** en onglets action / toClose — **pas** en Historique / Clôturées.
4. **Panier membre** (avant validation commande) : l'adhérent retire déjà des lignes via le panier — **existant**, ne pas casser.
5. **Pas de retrait** sur commandes **clôturées** ou **annulées**.

---

## Déjà implémenté (ne pas réinventer)

### API

- `POST /api/admin/orders/cancel-item` — body `{ orderItemId }`
- Admin only (`requireAdminUser`)
- Marque `order_items.cancelled_at` (soft delete, pas de DELETE)
- Recalcule `orders.total` via `syncOrderGrossTotal`
- Si dernière ligne → commande `cancelled`, total 0, restitution avoir si `credit_applied`
- Email membre (+ copie admin) via `sendOrderItemCancelled`
- Modifiable si statut `confirmed` ou `delivered` (`orderIsModifiable`)

### UI admin

- Bouton **✕ Retirer** sur chaque ligne commande (`app/[locale]/admin/commandes/page.tsx`)
- Récap groupé : bouton Retirer + `cancelAggregatedLine` (N appels API séquentiels)
- `canRemoveFromRecap = mode === 'action' || mode === 'toClose'` ✅

### Affichage membre

- Lignes avec `cancelled_at` filtrées partout (Mon compte, exports, clôture, Excel…)

### Panier (avant commande)

- `removeItem` dans `app/[locale]/(members)/panier/page.tsx` — **hors périmètre v2.0-e**

---

## Écarts probables à corriger (priorité session)

### 1. Périmètre UI incohérent (bug probable)

| Zone | Comportement actuel | Comportement v2.0-e |
|------|---------------------|---------------------|
| Récap groupé | Retrait seulement action / toClose | ✅ OK |
| Lignes par commande | Retrait si `confirmed` ou `delivered` **dans tous les modes** | ❓ Devrait être **action / toClose seulement** |

**Exemple de risque :** onglet **Historique** + filtre « Livrée » → bouton Retirer encore visible.

**Fix suggéré :** remplacer

```ts
const canRemove = order.status === 'confirmed' || order.status === 'delivered'
```

par quelque chose comme :

```ts
const canRemove =
  (mode === 'action' || mode === 'toClose') &&
  (order.status === 'confirmed' || order.status === 'delivered')
```

(+ garder la garde API côté serveur inchangée)

### 2. Pas de tests automatisés

- Aucun test sur `cancel-item` ni sur la logique de périmètre UI.
- Ajouter au minimum des tests unitaires / route (mock Supabase) ou test node sur helpers si extraits.

### 3. Retrait en masse (récap groupé)

- `cancelAggregatedLine` boucle sur N `orderItemIds` — échec au milieu = état partiel.
- Amélioration possible : endpoint batch ou rollback / message clair « X/Y retirés ».

### 4. Cas limites à valider avec Joel (pas forcément du code)

- Retirer une ligne **« Ajout magasin »** (`added_at_closure`) en toClose ?
- Retirer une ligne dont qté/prix a été modifiée (baseline v2.0-d) ?
- Retirer depuis récap groupé quand **plusieurs membres** ont le même article Biopartner ?
- Email : 1 email **par commande/fournisseur** retirée — OK pour Joel ou regrouper par membre (v2.0-a) ?

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `app/api/admin/orders/cancel-item/route.ts` | Logique retrait + email |
| `app/[locale]/admin/commandes/page.tsx` | UI Retirer (ligne + récap) |
| `lib/orders/lifecycle.ts` | `orderIsModifiable` |
| `lib/orders/totals.ts` | `syncOrderGrossTotal` |
| `lib/email/sendOrderItemCancelled.ts` | Email « Commande modifiée » |
| `lib/admin/order-export.ts` | Récap groupé / export (ignore `cancelled_at`) |
| `components/orders/MemberOrderDetail.tsx` | Vue membre (lignes actives) |
| `app/(members)/panier/page.tsx` | Panier pré-commande (≠ v2.0-e) |

---

## Plan de travail proposé (petites étapes)

1. **Auditer** preprod : reproduire retrait en action, toClose, historique.
2. **Aligner** `canRemove` UI sur le périmètre récap (si confirmé avec Joel).
3. **Tester** cas limites (dernière ligne, avoir, ligne ajoutée à la clôture).
4. **Ajouter** 2–3 tests ciblés (API ou helper).
5. **PR → staging** → Joel teste 1 scénario réel (Biopartner rupture).
6. **PR staging → main** après validation.

Estimation : **½ à 1 journée** si périmètre = polish + tests. Plus si Joel demande retrait côté membre sur commande déjà passée (hors spec actuelle).

---

## Plan de test Joel / Georgina (preprod)

### Scénario A — À traiter (confirmée)

- [ ] Membre passe commande test (1 fournisseur, 2 produits)
- [ ] Admin → À traiter → Retirer 1 produit
- [ ] Total commande recalculé
- [ ] Email membre reçu (« Commande modifiée »)
- [ ] Mon compte → 1 seul produit visible

### Scénario B — À clôturer (livrée)

- [ ] Passer commande en **Livrée**
- [ ] Admin → À clôturer → Retirer 1 ligne (optionnel : après edit qté v2.0-d)
- [ ] Clôture groupée → totaux cohérents

### Scénario C — Récap groupé

- [ ] Filtrer un fournisseur Biopartner (plusieurs membres)
- [ ] Récap vert → Retirer 1 article agrégé
- [ ] Chaque membre concerné reçoit son email

### Scénario D — Interdictions

- [ ] Onglet **Clôturées** → pas de bouton Retirer
- [ ] Onglet **Historique** → pas de bouton Retirer (après fix périmètre)
- [ ] API directe sur commande clôturée → erreur 400

### Scénario E — Dernière ligne

- [ ] Retirer le seul produit → commande **Annulée**, email adapté

---

## Ce qu'il ne faut PAS faire dans cette session

- ❌ Retrait par le **membre** sur commande déjà validée (sauf demande explicite Joel)
- ❌ Confondre avec **Mes favoris** (retirer des favoris)
- ❌ Confondre avec **case récupéré** v1.6 (localStorage)
- ❌ Masquer produit catalogue (`admin/fournisseurs`) — autre feature
- ❌ Migration SQL (colonne `cancelled_at` existe déjà)

---

## Prompt suggéré pour nouvelle conversation

```
Contexte : docs/handoff-v2.0-e-retirer-produit.md

Objectif v2.0-e : finaliser « Retirer un produit » admin — surtout aligner le périmètre UI (action/toClose only), tests, validation cas limites.

Commence par auditer app/[locale]/admin/commandes/page.tsx et cancel-item/route.ts.
Propose un plan numéroté avant de modifier. Pas de commit sans « go ».
```

---

## Références

- `docs/handoff-avant-merge-main-juin2026.md` — vue d'ensemble v2.0
- `docs/guide-joel.md` — usage gérant
- `docs/mail-joel-mai2026/mail-joel.html` §5 — texte envoyé à Joel sur cette feature
- `docs/workflow-git.md` — PR, CI, tags

---

*Handoff interne — ptitmag-next · juin 2026*
