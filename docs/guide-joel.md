# Le P'tit Mag — Guide pour Joel

**Site :** [www.leptitmag.org](https://www.leptitmag.org)  
**Ton compte admin :** `info@leptitmag.org`  
**Date :** mai 2026

> Ce document est fait pour toi. Pas besoin de connaître la technique — seulement **où cliquer** et **quoi faire** au quotidien.

---

## En une phrase

Le site est **livré et en ligne** sur le domaine de l'association. Tu peux te connecter, gérer les commandes, les membres et les catalogues. Georgina reste disponible pour les bugs et les imports de fichiers.

---

## Tes liens utiles

| Quoi | Lien |
|------|------|
| Site public | [www.leptitmag.org](https://www.leptitmag.org) |
| Connexion | [/fr/connexion](https://www.leptitmag.org/fr/connexion) |
| Tableau de bord admin | [/fr/admin](https://www.leptitmag.org/fr/admin) |
| Commandes | [/fr/admin/commandes](https://www.leptitmag.org/fr/admin/commandes) |
| Membres & cotisations | [/fr/admin/membres](https://www.leptitmag.org/fr/admin/membres) |
| Fournisseurs | [/fr/admin/fournisseurs](https://www.leptitmag.org/fr/admin/fournisseurs) |
| Import produits | [/fr/admin/import](https://www.leptitmag.org/fr/admin/import) |

*Tu peux aussi taper `leptitmag.org` — tu arrives au même site.*

---

## Première connexion (5 minutes)

1. Va sur **Connexion** avec `info@leptitmag.org`
2. Si tu n'as pas de mot de passe → clique **Mot de passe oublié**
3. Une fois connecté → clique **⚙ Admin** en haut à droite
4. Parcours rapidement : Commandes, Membres, Fournisseurs, Import

**À valider de ton côté :** que tu arrives bien sur l'admin avec ton propre mot de passe.

---

## Ta semaine type

| Étape | Où | Quoi faire |
|-------|-----|------------|
| 1 | Ta boîte mail | Tu reçois une copie à chaque commande adhérent |
| 2 | Admin → **Commandes** | Export CSV, préparation des commandes groupées |
| 3 | Admin → **Commandes** | Marquer **Livrée** ou **Annulée** — l'adhérent le voit dans Mon compte |
| 4 | Admin → **Membres** | Passer un adhérent en **Cotisé** et saisir le montant si besoin |
| 5 | Admin → **Fournisseurs** | **Ouvrir les commandes** avec une date limite quand c'est le moment |
| 6 | Admin → **Import** | Mettre à jour les catalogues (fichiers préparés par Georgina) |

---

## Les 3 actions que tu fais le plus souvent

### 1. Ouvrir les commandes (par fournisseur)

**Admin → Fournisseurs**

- **Catalogue visible** = le fournisseur apparaît dans le catalogue (les adhérents peuvent voir les produits)
- **Commandes ouvertes** = les adhérents peuvent ajouter au panier
- **Date limite** = obligatoire quand les commandes sont ouvertes — après cette date, le panier se ferme tout seul

Tu peux ouvrir Biopartner Général le lundi et les locaux le jeudi, chacun avec son propre délai.

### 2. Masquer un produit indisponible (producteurs locaux)

**Admin → Fournisseurs → cliquer sur le fournisseur → Produits ▾**

- **Masquer** = invisible pour les adhérents (reste en base)
- **Afficher** = réapparaît dans le catalogue

Utile quand un légume manque **sans refaire un import**.

*Biopartner : pas de liste produit ici (trop grand) — on gère via import CSV.*

### 3. Passer un membre en « Cotisé »

**Admin → Membres**

- Statut **Non cotisé** → l'adhérent paie **+20 %** sur les prix
- Statut **Cotisé** + montant → prix catalogue normal

---

## Biopartner — 4 catalogues

Au lieu d'un seul bloc Biopartner, il y a **4 catalogues** :

1. Biopartner – Général  
2. Biopartner – Grands emballages  
3. Biopartner – Surgelés  
4. Biopartner – Viandes fraîches  

Chacun a son import et son ouverture/fermeture de commandes **indépendants** dans Fournisseurs.

**Admin → Import → Biopartner — 4 catalogues** pour importer un CSV.

Si tu n'as qu'un gros fichier : **Admin → Import → Découper en 4 CSV** (outil automatique — à relire avant d'importer).

---

## Ce que voient les adhérents

1. Inscription gratuite → email de confirmation  
2. Catalogue → choix fournisseur → catégorie → produits  
3. Panier → validation → email de confirmation  
4. Mon compte → suivi des commandes (Confirmée → Livrée)  
5. Suppression du compte possible à tout moment (Mon compte → Zone sensible)

**Non cotisé** = +20 % affiché sur les produits et au panier.  
**Cotisé** = prix revendeur sans marge.

---

## Mises à jour du site (version test)

Quand Georgina prépare une **grosse modification**, elle la teste d'abord sur une **copie du site** :

| Site | Rôle |
|------|------|
| **www.leptitmag.org** | Le vrai site — adhérents et toi au quotidien |
| **preprod.leptitmag.org** | Version test — Georgina (+ parfois quelques membres) avant mise en ligne |

**Tu n'as rien à faire** sur la préprod sauf si Georgina te demande de vérifier quelque chose avant qu'on le mette en prod.

---

## Ce qui reste pour plus tard (non bloquant)

- Message email « lien expiré » alors que le compte fonctionne déjà (cosmétique)
- Vrais logos fournisseurs (aujourd'hui : emoji + description)

---

## En cas de problème

| Problème | Qui contacter |
|----------|---------------|
| Site inaccessible, bug, email qui ne part pas | **Georgina** |
| Question sur une commande ou un produit | **Toi ↔ adhérent** |
| Import CSV, nouveau fournisseur, fichier à préparer | **Georgina** |

---

## Coût aujourd'hui

**~0 CHF/mois** pour faire tourner le site (hébergement et base de données gratuits pour la taille actuelle).

Le **nom de domaine** `leptitmag.org` est chez **Infomaniak** (compte asso). Les **emails** `@leptitmag.org` restent chez Infomaniak.

Option maintenance Georgina : **120 CHF/mois** (mises à jour, bugs, petites évolutions) — à discuter avec l'asso.

---

*Guide gérant — Le P'tit Mag · mai 2026*
