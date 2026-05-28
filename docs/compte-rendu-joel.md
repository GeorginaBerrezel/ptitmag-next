# Le p'tit mag — Compte rendu complet pour Joel

**Site en production :** [ptitmag-next.vercel.app](https://ptitmag-next.vercel.app)  
**Données :** Supabase · **Code :** GitHub privé `ptitmag-next` · **Hébergement :** Vercel  
**Date :** mai 2026  
**Pour :** Joel & l'association Le P'tit Mag  
**Par :** Georgina Berrezel

---

## 1. Message court pour Joel (5 min de lecture)

### Où en est-on ?

Le site est **livré, en ligne et fonctionnel**. Tout le plan convenu lors de l'entretien initial a été implémenté et testé. Les améliorations demandées ensuite (mobile, cotisations, suppression de compte, session Joel du 28 mai) sont **déployées en production**.

### Ce que tu peux faire dès maintenant

| Action | Lien |
|--------|------|
| Site public | [ptitmag-next.vercel.app](https://ptitmag-next.vercel.app) |
| Connexion admin | [/fr/connexion](https://ptitmag-next.vercel.app/fr/connexion) |
| Admin — Tableau de bord | [/fr/admin](https://ptitmag-next.vercel.app/fr/admin) |
| Admin — Commandes | [/fr/admin/commandes](https://ptitmag-next.vercel.app/fr/admin/commandes) |
| Admin — Membres & cotisations | [/fr/admin/membres](https://ptitmag-next.vercel.app/fr/admin/membres) |
| Admin — Fournisseurs | [/fr/admin/fournisseurs](https://ptitmag-next.vercel.app/fr/admin/fournisseurs) |
| Admin — Import produits | [/fr/admin/import](https://ptitmag-next.vercel.app/fr/admin/import) |

**Ton compte admin :** `info@leptitmag.org` — accès complet (identique a Georgina).

**À faire de ton côté :** te connecter une fois pour valider que tout fonctionne (mot de passe ou « mot de passe oublié »).

### Ta routine hebdo (inchangée dans l'esprit)

1. **Emails** — tu reçois une copie a chaque commande adhérent
2. **Admin → Commandes** — export CSV, préparation commandes groupées
3. **Marquer Livrée / Annulée** — l'adhérent voit le statut dans Mon compte
4. **Import produits** — quand Georgina te prepare le fichier (CSV / Excel selon fournisseur)
5. **Ouvrir / fermer les commandes** — par fournisseur, avec un délai (voir section 8)

### Ce qui reste « plus tard » (non bloquant)

- Message email « lien expire » alors que le compte fonctionne déjà (cosmetique)
- Vrais logos fournisseurs (aujourd'hui : emoji + courte description dans le catalogue)
- Domaine personnalise (`leptitmag.org`) — le site tourne déjà sur Vercel
- Scroll en haut de page sur mobile — correction en cours de déploiement

### Coût infrastructure aujourd'hui

**~0 CHF/mois** (Supabase gratuit + Vercel gratuit). Largement suffisant pour la taille actuelle et une croissance importante.

---

## 2. Plan initial — les 7 étapes (entretien)

| # | Sujet | Statut | Detail |
|---|-------|--------|--------|
| 1 | Auth (mot de passe visible, reset, emails prod) | ✅ Livré | Pages mot de passe oublié / réinitialisation, liens email prod |
| 2 | Deadlines — fournisseurs restent visibles | ✅ Livré | Deadline passée = informatif, panier désactivé |
| 3 | Filtres, tri catégorie, recherche | ✅ Livré | Navigation Fournisseur → Catégorie → Produits, recherche sans accents |
| 4 | Performance (~2000 produits) | ✅ Livré | Chargement à la demande, APIs dédiées, affichage progressif |
| 5 | Droits admin Joel | ✅ Livré | `info@leptitmag.org` = accès complet admin |
| 6 | Cotisations | ✅ Livré | Montants admin, totaux, graphiques, retrait « essai 3 mois » |
| 7 | Suppression de compte | ✅ Livré | Zone sensible Mon compte, confirmation « SUPPRIMER » |
| + | UX mobile | ✅ Livré | Cartes produits, heroes lisibles, infos fournisseurs |

**En attente de validation Joel :** connexion admin avec son propre mot de passe.

---

## 3. Session Joel du 28 mai 2026 — 6 phases supplémentaires

Après l'entretien initial, Joel a valide une serie de mises a jour lors d'un appel telephonique. Toutes ont ete implementees et deployees.

### Phase 1 — Prix +20 % pour les non cotisés

| Membre | Prix affiche |
|--------|----------------|
| **Non cotisé** | Prix catalogue × **1,20** (+20 %) |
| **Cotisé** | Prix catalogue **sans** marge |
| **Biopartner sous quantité minimum (UC)** | **+10 %** en plus (cumul possible avec +20 %) |

- Badge **« +20 % »** sur les produits, mention dans **Mon compte** et au panier
- Le bon prix est **recalcule côté serveur** a la commande (sécurité)

### Phase 2 — Joel ouvre / ferme les commandes (par fournisseur)

**Avant :** les dates dans les fichiers CSV ouvraient/fermaient les commandes automatiquement.

**Maintenant :**

| Element | Comportement |
|---------|----------------|
| **Catalogue** | Toujours visible (si fournisseur actif) |
| **Commander** | Seulement si Joel active **« Commandes ouvertes »** |
| **Délai max** | Obligatoire quand les commandes sont ouvertes |
| **Délai dépassé** | Fermeture automatique (plus de panier) |

**Ou :** Admin → **Fournisseurs** → toggle **Catalogue visible** + **Commandes ouvertes** + date/heure limite.

> **Migration SQL requise :** `supabase/migrations/20260528_supplier_orders.sql`

### Phase 3 — Masquér un produit (producteurs locaux)

**Ou :** Admin → Fournisseurs → **Produits ▾** (sauf Biopartner, catalogue trop grand).

- **Masquér** = invisible pour les membres, conserve en base
- **Afficher** = réapparaît dans le catalogue
- Utile quand un legume manque **sans refaire un import**

**Biopartner :** pas de liste produit en admin — on gere via **import CSV** (produits absents du fichier retires de ce catalogue).

### Phase 4 — Quatre catalogues Biopartner

Un seul « Biopartner » → **4 catalogues** distincts :

1. **Biopartner – Général**
2. **Biopartner – Grands emballages**
3. **Biopartner – Surgelés**
4. **Biopartner – Viandes fraîches**

- **4 cartes** dans le catalogue membre
- **4 imports** séparés (Admin → Import)
- **Délai / commandes** independants par catalogue (Fournisseurs)
- **Outil bonus :** « Découper en 4 CSV » si Joel n'a qu'un gros fichier — répartition automatique (a valider avant import)

L'**ancien** fournisseur « Biopartner » unique est **masqué** (donnees conservees pour l'historique — **ne pas le réactiver**).

> **Migration SQL requise :** `supabase/migrations/20260528_biopartner_catalogs.sql`

### Phase 5 — Imports locaux sans tout effacer

**Avant :** chaque import Excel **supprimait** toute la liste du producteur puis la recreait.

**Maintenant :** **mise a jour** des prix + ajout des nouveaux produits.  
Un produit **absent du fichier** reste visible → Joel le **masqué** a la main si besoin.

Concerne : feuille hebdo + imports locaux (Bioterroir, etc.).

### Phase 6 — Catalogue Biopartner (navigation & performance)

- Navigation par **catégories** (pas de chargement de tout le catalogue d'un coup)
- **Recherche** toujours disponible sur l'ensemble du catalogue

---

## 4. Fonctionnalites livrées (detail)

### Site public (FR/EN)

- Accueil, Adhésion, Producteurs, Contact — responsive mobile
- Bilingue (francais / anglais)
- Textes adhésion mis a jour (sans période d'essai 3 mois)
- WhatsApp, Google Maps, horaires
- Produits éphémères mis en avant sur l'accueil (bandeau orange)

### Espace adhérents

- Inscription / connexion / mot de passe oublie
- Catalogue : fournisseurs → catégories → produits
- Recherche globale (produits + fournisseurs, sans accents)
- Panier, commandes groupées par fournisseur
- Email de confirmation a l'adhérent + copie admin
- Mon compte : profil, historique commandes, cotisation affichee si cotisé
- Suppression de compte (définitive, commandes passées conservees côté admin)
- Majoration +20 % visible pour les non cotisés

### Espace admin (Joel + Georgina)

- **Tableau de bord** — KPIs, commandes/mois, membres cotisés/mois, total cotisations
- **Commandes** — statuts, export CSV, filtres
- **Membres** — statut Non cotisé / Cotisé, montant CHF, cotisation active
- **Fournisseurs** — activer / masquér, ouvrir / fermer commandes, délai
- **Import produits** — Biopartner (4 catalogues), fournisseurs locaux, imports hebdo, outil découpe CSV

### Emails automatiques

- Confirmation de commande (adhérent + BCC admin)
- Configuration prod (`NEXT_PUBLIC_SITE_URL` + Supabase)

### Ce qui fonctionnait déjà (ne pas casser)

| Domaine | Etat |
|---------|------|
| Catalogue membre `/commandes` | Fournisseur → catégorie → produits, recherche, filtres |
| Panier + checkout multi-fournisseur | localStorage, commande par fournisseur, e-mail confirmation |
| Admin import | Biopartner CSV, locaux xlsx, feuille hebdo |
| Biopartner UM/UC | UM=HT/TTC, UC=min + pas 3/6/9, +10 % si qté < UC |
| Import Biopartner | Desactive l'ancien catalogue → reactive uniquement le CSV courant (~1 356 produits) |
| Membres admin | Statuts trial / member, cotisations, badges |

---

## 5. Ce qui a change depuis la premiere version

- Plus de « 3 mois d'essai » — inscription libre, cotisation quand l'adhérent rejoint l'asso
- **Cotisations** — Joel peut saisir le montant par membre, voir le total et les stats
- **Suppression de compte** — les adhérents peuvent supprimer leur compte depuis Mon compte
- **Catalogue ~2000 produits** — chargement rapide, recherche globale (sans accents)
- **Mobile** — cartes produits et textes des pages Adhésion / Producteurs / Contact corriges
- **Fournisseurs visibles après deadline** — date informative, panier ferme si commande fermee
- **+20 % non cotisés** — majoration automatique catalogue + panier + commande
- **Joel controle les commandes** — toggle ON/OFF par fournisseur + délai
- **4 catalogues Biopartner** — au lieu d'un seul bloc
- **Imports locaux incrémentaux** — plus de suppression totale a chaque import
- **Masquage produit** — pour les locaux, sans ré-importer

---

## 6. Guide du gérant — version mise a jour

### Liens importants

| Quoi | Lien |
|------|------|
| Site | [ptitmag-next.vercel.app](https://ptitmag-next.vercel.app) |
| Connexion | [/fr/connexion](https://ptitmag-next.vercel.app/fr/connexion) |
| Créer un compte | [/fr/inscription](https://ptitmag-next.vercel.app/fr/inscription) |
| Admin — Tableau de bord | [/fr/admin](https://ptitmag-next.vercel.app/fr/admin) |
| Admin — Commandes | [/fr/admin/commandes](https://ptitmag-next.vercel.app/fr/admin/commandes) |
| Admin — Membres | [/fr/admin/membres](https://ptitmag-next.vercel.app/fr/admin/membres) |
| Admin — Fournisseurs | [/fr/admin/fournisseurs](https://ptitmag-next.vercel.app/fr/admin/fournisseurs) |
| Admin — Import | [/fr/admin/import](https://ptitmag-next.vercel.app/fr/admin/import) |

### Premiere connexion Joel

1. Aller sur **Inscription** ou **Connexion** avec `info@leptitmag.org`
2. Si compte existant → **Mot de passe oublié**
3. Une fois connecté → **⚙ Admin** dans la barre du haut

### Parcours adhérent (rappel)

1. Inscription gratuite → confirmation email
2. Catalogue `/fr/commandes` — choix fournisseur, catégorie, produits
3. Panier → validation → email de confirmation
4. Mon compte — suivi statuts (Confirmée → Livrée)
5. Suppression possible a tout moment (Mon compte → Zone sensible)

### Routine admin hebdo

1. **Emails** — notification automatique a chaque commande
2. **Commandes** — export CSV, préparation groupee par fournisseur
3. **Livrée** — l'adhérent voit le changement dans Mon compte
4. **Annulée** — si besoin + contact manuel adhérent
5. **Membres** — passer en « Cotisé », saisir montant cotisation si adhérent
6. **Import** — mise a jour catalogue (fichiers prepares par Georgina)
7. **Fournisseurs** — ouvrir les commandes avec un délai quand c'est le moment

### Rappels pratiques

| Action | Ou |
|--------|-----|
| Importer Biopartner | Admin → Import → un des 4 catalogues |
| Découper un gros CSV | Admin → Import → « Découper en 4 CSV » |
| Ouvrir les commandes | Admin → Fournisseurs |
| Masquér un legume | Admin → Fournisseurs → Produits (locaux) |
| Passer un membre cotisé | Admin → Membres |
| Voir les commandes | Admin → Commandes |

**Vercel** = le site (code) · **Supabase** = les donnees (produits, commandes, membres).

### Workflow type pour Joel

1. **Importer** les catalogues (locaux / Biopartner) quand les prix changent — pas chaque semaine pour les locaux
2. **Ouvrir** les commandes par fournisseur avec un **délai**
3. Les membres **commandent**
4. Joel **confirme / livré / annule** en admin
5. Produits indisponibles locaux → **Masquér** (pas forcement ré-importer)

### En cas de problème

| Problème | Qui contacter |
|----------|---------------|
| Site down, bug technique, email | Georgina |
| Question commande / produit | Joel ↔ adhérent |
| Import CSV / nouveau fournisseur | Georgina |

---

## 7. Technique & infrastructure

### Stack

| Composant | Role |
|-----------|------|
| **Next.js 16** | Frontend + API |
| **Supabase** | Auth, PostgreSQL, stockage (avatars) |
| **Vercel** | Hébergement, déploiement auto a chaque push GitHub |
| **GitHub** | Code source prive `ptitmag-next` |

### Capacite Supabase (plan gratuit)

| | Aujourd'hui | Dans 5 ans (optimiste) | Limite gratuite |
|---|-------------|------------------------|-----------------|
| Membres actifs | ~50 | ~300 | 50 000 |
| Commandes / semaine | ~60–90 | ~600 | illimite |
| Commandes / an | ~4 000 | ~30 000 | illimite |
| Stockage | < 5 MB | ~50 MB | 500 MB |

**En clair :** le plan gratuit tient largement. Si un jour vous dépasséz → plan payant ~25 CHF/mois (×15 la capacite).

### Comparaison parlante

Une Migros Express ≈ **365 000 transactions/an**. Le p'tit mag ≈ **4 000 commandes/an** — environ **90× moins**. La techno (PostgreSQL, AWS) est la meme famille que celle utilisee par de grandes applications ; pour une cooperative locale, la marge est enorme.

### « Ça va pas casser du jour au lendemain ? »

**Technologie :**
- Supabase = PostgreSQL (35 ans d'existence), hébergé AWS
- Disponibilité annoncee ~99,9 %
- Donnees exportables en standard PostgreSQL → migration possible si besoin

**Code :**
- Next.js / Vercel = stack professionnelle courante
- Code **sur mesure** pour commandes groupées, adhérents, cotisations — pas une licence Shopify a 50–200 CHF/mois
- **Propriété du code** transferee a l'association après paiement integral du devis

---

## 8. Devis DEV-2026-001 — rappel

| | |
|---|---|
| **Total prestation** | CHF 3 200.– HT (TVA 0 % association) |
| **Paiement** | 40 % signature (1 280.–) + 60 % livraison (1 920.–) |
| **Statut projet** | Livré en production — devis = régularisation |
| **Positionnement tarif** | ~43 % sous tarif marche suisse (CHF 5 600–6 000 estimé) — tarif associatif assumé |

**Ce qui justifie CHF 3 200 :** valeur livrée (outil sur mesure, années d'usage), pas heures passées. Georgina a pilote besoins, tests, config Supabase/Vercel, relation client ; les outils IA ont accéléré l'ecriture du code — transparence recommandée envers l'asso si question posee.

---

## 9. Grille tarifaire — association vs marche

Estimation pour un site équivalent (catalogue multi-fournisseurs, espace adhérent, admin, emails, bilingue, ~2000 produits).

| Poste | Tarif association (Le P'tit Mag) | Tarif marche suisse (estimation) | Économie asso |
|-------|----------------------------------|----------------------------------|---------------|
| **Développement initial** (devis DEV-2026-001) | **CHF 3 200.–** HT | CHF 5 600 – 6 000.– | **~43 %** |
| **Maintenance & support** (optionnel, /mois) | **CHF 120.–** | CHF 180 – 250.– | **~33–52 %** |
| **Infrastructure** (Supabase + Vercel) | **CHF 0.–** /mois | CHF 0.– /mois (meme stack gratuite) | = |
| **Vercel Pro** (si besoin futur, /mois) | ~CHF 20.– | ~CHF 20.– | = |
| **Supabase Pro** (si > 50 000 users, /mois) | ~CHF 25.– | ~CHF 25.– | = |

### Ce que le tarif association inclut (vs une agence classique)

| Inclus dans CHF 3 200 | Souvent en supplément chez une agence |
|------------------------|--------------------------------------|
| Auth complete + reset mot de passe | +500 – 800 CHF |
| Catalogue ~2000 produits performant | +1 000 – 1 500 CHF |
| Admin sur mesure (commandes, membres, imports) | +1 500 – 2 000 CHF |
| Emails transactionnels | +300 – 500 CHF |
| Bilingue FR/EN | +400 – 600 CHF |
| Cotisations + suppression compte | +400 – 600 CHF |
| Déploiement + config Supabase/Vercel | +300 – 500 CHF |

**Total marche estimé :** CHF 5 600 – 6 000 pour un équivalent fonctionnel.

### Comparatif « faire soi-même » vs solution sur mesure

| Option | Coût an 1 | Limites |
|--------|-----------|---------|
| **Shopify + apps** | ~600 – 2 400 CHF/an (abonnement) | Pas adapte aux commandes groupées multi-fournisseurs, pas de gestion cotisations |
| **WordPress + WooCommerce** | ~200 – 500 CHF/an + dev | Maintenance lourde, performance catalogue difficile |
| **Le p'tit mag (sur mesure)** | **3 200 CHF une fois** + 0 CHF infra | Adapte a 100 % au workflow Joel |

---

## 10. Coûts recurrents (après livraison)

| Service | Detail | Coût |
|---------|--------|------|
| Supabase Free | DB, auth, stockage | **0 CHF/mois** |
| Vercel | Hébergement (gratuit suffit pour l'instant) | **0 CHF/mois** |
| Maintenance & support (optionnel) | Mises a jour, bugs, évolutions | **120 CHF/mois** (propose au devis) |
| Vercel Pro (si besoin futur) | Plus de bande passante | ~20 CHF/mois |
| Supabase Pro (si besoin futur) | Plus de capacite | ~25 CHF/mois |

**Resume pour Joel :** aujourd'hui **0 CHF/mois** d'infra. Peut tenir **100× le volume actuel** sans changement. Donnees = votres, exportables.

---

## 11. Actions recommandées (prochaines semaines)

| Priorité | Action | Qui |
|----------|--------|-----|
| 1 | Joel teste connexion admin complete | Joel |
| 2 | Régularisation devis / paiement solde | Asso + Georgina |
| 3 | Exécuter les migrations SQL en prod si pas encore fait (commandes ouvertes + 4 catalogues Biopartner) | Georgina |
| 4 | Domaine custom `leptitmag.org` → Vercel (optionnel) | Georgina |
| 5 | Améliorations mineures (lien email, logos fournisseurs) | Quand besoin reel |

---

## 12. Historique des livraisons (chronologie)

| Période | Livrables |
|---------|-----------|
| **Entretien initial** | Plan 7 étapes valide |
| **Phase dev 1–7** | Auth, deadlines, catalogue, perf, admin Joel, cotisations, suppression compte |
| **Avril–mai 2026** | UX mobile, corrections Biopartner UM/UC, nettoyage catalogue 10k→1.3k produits |
| **24 mai 2026** | Point d'avancement — site livré en production |
| **28 mai 2026 — Phase 1** | +20 % non cotisés |
| **28 mai 2026 — Phase 2** | Joel ouvre/ferme commandes par fournisseur |
| **28 mai 2026 — Phase 3** | Masquér/afficher produit (locaux) |
| **28 mai 2026 — Phase 4** | 4 catalogues Biopartner + outil découpe CSV |
| **28 mai 2026 — Phase 5** | Imports locaux incrémentaux |
| **28 mai 2026 — Phase 6** | Navigation Biopartner par catégories |
| **Mai 2026** | Corrections UX mobile (scroll horizontal, scroll en haut de page) |

---

*Document complet — généré après validation des phases 1 a 6 et livraison initiale — ptitmag-next · mai 2026.*
