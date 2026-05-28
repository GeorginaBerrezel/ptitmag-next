# Le p'tit mag — Compte rendu pour Joel

**Site :** ptitmag-next (Vercel) · **Données :** Supabase  
**Date :** mai 2026

---

## En résumé

Le site permet aux **membres** de commander chez plusieurs **fournisseurs** (locaux + Biopartner). **Joel** gère tout depuis l’**admin** : catalogues, ouverture des commandes, membres, commandes reçues.

Voici ce qui a été mis en place lors de cette série de mises à jour.

---

## 1. Prix selon la cotisation (+20 %)

| Membre | Prix affiché |
|--------|----------------|
| **Non cotisé** | Prix catalogue × **1,20** (+20 %) |
| **Cotisé** | Prix catalogue **sans** marge |
| **Biopartner sous quantité minimum (UC)** | **+10 %** en plus (cumul possible avec +20 %) |

- Badge **« +20 % »** sur les produits, mention dans **Mon compte** et au panier.
- Le bon prix est enregistré dans la commande.

---

## 2. Joel ouvre / ferme les commandes (par fournisseur)

**Avant :** les dates dans les fichiers CSV ouvraient/fermaient les commandes automatiquement.

**Maintenant :**

| Élément | Comportement |
|---------|----------------|
| **Catalogue** | Toujours visible (si fournisseur actif) |
| **Commander** | Seulement si Joel active **« Commandes ouvertes »** |
| **Délai max** | Obligatoire quand les commandes sont ouvertes |
| **Délai dépassé** | Fermeture automatique (plus de panier) |

**Où :** Admin → **Fournisseurs** → toggle **Catalogue visible** + **Commandes ouvertes** + date/heure limite.

---

## 3. Masquer un produit (producteurs locaux)

**Où :** Admin → Fournisseurs → **Produits ▾** (sauf Biopartner, catalogue trop grand).

- **Masquer** = invisible pour les membres, conservé en base.
- **Afficher** = réapparaît dans le catalogue.
- Utile quand un légume manque **sans refaire un import**.

**Biopartner :** pas de liste produit en admin — on gère via **import CSV** (produits absents du fichier retirés de ce catalogue).

---

## 4. Quatre catalogues Biopartner

Un seul « Biopartner » → **4 catalogues** distincts :

1. **Biopartner – Général**
2. **Biopartner – Grands emballages**
3. **Biopartner – Surgelés**
4. **Biopartner – Viandes fraîches**

- **4 cartes** dans le catalogue membre.
- **4 imports** séparés (Admin → Import).
- **Délai / commandes** indépendants par catalogue (Fournisseurs).
- **Outil bonus :** « Découper en 4 CSV » si Joel n’a qu’un gros fichier — répartition automatique (à valider avant import).

L’**ancien** fournisseur « Biopartner » unique est **masqué** (données conservées pour l’historique — ne pas le réactiver).

---

## 5. Imports locaux sans tout effacer

**Avant :** chaque import Excel **supprimait** toute la liste du producteur puis la recréait.

**Maintenant :** **mise à jour** des prix + ajout des nouveaux produits.  
Un produit **absent du fichier** reste visible → Joel le **masque** à la main si besoin.

Concerne : feuille hebdo + imports locaux (Bioterroir, etc.).

---

## 6. Catalogue Biopartner (navigation)

- Navigation par **catégories** (pas de chargement de tout le catalogue d’un coup).
- **Recherche** toujours disponible.

---

## Rappels pratiques

| Action | Où |
|--------|-----|
| Importer Biopartner | Admin → Import → un des 4 catalogues |
| Découper un gros CSV | Admin → Import → « Découper en 4 CSV » |
| Ouvrir les commandes | Admin → Fournisseurs |
| Masquer un légume | Admin → Fournisseurs → Produits (locaux) |
| Passer un membre cotisé | Admin → Membres |
| Voir les commandes | Admin → Commandes |

**Vercel** = le site (code) · **Supabase** = les données (produits, commandes, membres).

---

## Workflow type pour Joel

1. **Importer** les catalogues (locaux / Biopartner) quand les prix changent — pas chaque semaine pour les locaux.
2. **Ouvrir** les commandes par fournisseur avec un **délai**.
3. Les membres **commandent**.
4. Joel **confirme / livre / annule** en admin.
5. Produits indisponibles locaux → **Masquer** (pas forcément ré-importer).

---

*Document généré après validation des phases 1 à 6 — ptitmag-next.*
