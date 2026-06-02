# Handoff — nouveau chat (juin 2026)

> **À copier-coller en ouverture d’un nouveau chat Cursor.**  
> Georgina = débutante en dev : expliquer simplement, avancer **étape par étape**, **valider avec moi avant chaque modification de code**. Tous les changements passent d’abord par **preprod** (`staging` → `preprod.leptitmag.org`), pas directement en prod.

---

## 1. Contexte projet (en bref)

- **Site :** [www.leptitmag.org](https://www.leptitmag.org) — association Le p'tit mag, St-Romain (Ayent), Valais
- **Preprod :** [preprod.leptitmag.org](https://preprod.leptitmag.org) — branche Git `staging`
- **Prod :** branche Git `main`
- **Stack :** Next.js, Supabase (auth + base de données), Vercel, emails SMTP Infomaniak (`info@leptitmag.org`)
- **Admin Joel :** `info@leptitmag.org` → [/fr/admin](https://www.leptitmag.org/fr/admin)
- **Marc :** co-fondateur asso, retours UX / métier (mail récent)

### ⚠️ Point important — base de données partagée

**Prod et preprod utilisent la MÊME base Supabase.**

Conséquences :
- Un test sur preprod crée de **vrais comptes** visibles en prod (admin membres).
- Un lien de confirmation d’e-mail peut pointer vers preprod ou prod selon où la personne s’est inscrite — d’où des messages « lien invalide » alors que le compte existe parfois.
- **Prévu plus tard :** séparer preprod / prod (deux projets Supabase).

---

## 2. Ce qui a été livré récemment (prod + staging)

| Domaine | Détail |
|--------|--------|
| **Membres** | Inscription (prénom, nom, e-mail, NPA, commune, tél. opt.) → statut **Non membre** ; Joel passe en **Terre** ou **Ciel** ; e-mail auto à la validation |
| **Prix** | Terre = prix juste · Ciel = +20 % |
| **Horaires site** | Ven. 16h30–18h30, Sam. 9h–12h |
| **Admin commandes** | Récap vert par fournisseur, **export Excel** (colonnes Biopartner en tête), **retirer un produit** + e-mail membre |
| **Mon compte** | Onglets En cours / Historique, export CSV |
| **Archivage** | Commandes livrées > 6 mois, bilan annuel Excel |
| **Photos magasin** | Accueil, adhésion, contact |
| **Photos Biopartner** | ~7 550 photos liées au n° d’article |
| **Catalogue** | Recherche multi-mots, croix effacer, « Produits trouvés (N) » |
| **SEO** | Titres St-Romain/Ayent, favicon, JSON-LD |
| **Import Biopartner** | 4 catalogues ; CSV **point-virgule** obligatoire |

Docs utiles : `docs/guide-joel.md`, `docs/mail-joel-mai2026/mail-joel.html`

---

## 3. Problèmes signalés en production (priorité)

### 3.1 Inscription qui échoue — capture Camille Aglione

**Symptôme :** message rouge *« Impossible de créer le compte. Réessayez ou contactez Joel. »*  
**Données saisies (capture) :**
- Camille Aglione · `camilleangelo.aglione@gmail.com` · NPA 1966 · Botyre (Ayent) · 079 444 59 97

**Vérification base Supabase (juin 2026) :**
- **`camilleangelo.aglione@gmail.com` → aucun compte** (ni dans `auth.users`, ni dans `profiles`).
- L’inscription a **échoué avant** la création du compte (étape Supabase `signUp`).
- Le site affiche un message **générique** : la vraie cause est dans les logs serveur (`[auth/register] signUp:`) — pas visible pour l’utilisateur.

**Piste de diagnostic (prochain chat) :**
1. Consulter logs Vercel au moment de la tentative (prod).
2. Améliorer le message d’erreur (sans exposer de secrets) + journalisation.
3. Tester une inscription avec les mêmes données en preprod.
4. Vérifier config Supabase : Auth, rate limits, modèles e-mail, URLs autorisées (`www.leptitmag.org`, `preprod.leptitmag.org`, `/auth/callback`).

### 3.2 Sandra — inscription échouée aussi

- **Aucun compte** trouvé avec « sandra » dans l’e-mail ou le nom (recherche dans les ~1000 derniers users auth).
- **Besoin :** e-mail exact de Sandra pour re-vérifier.

### 3.3 Lien de confirmation « invalide » alors que ça marche parfois

**Symptôme (notes Georgina) :** plusieurs personnes voient *« lien invalide ou expiré »* ; parfois ça fonctionne quand même (surtout sur téléphone).

**Causes probables :**
1. **Même base prod/preprod** → lien reçu pour un domaine, ouvert sur l’autre.
2. Callback `/auth/callback` : si l’échange du `code` échoue → redirection vers `connexion?error=lien_invalide` (message parfois **trompeur** si le compte est déjà confirmé).
3. Lien ouvert **deux fois** ou après 24 h.
4. Client mail qui **précharge** le lien (consomme le code).

**Déjà noté dans le guide Joel :** message « lien expiré » alors que le compte fonctionne — cosmétique / UX à corriger.

**Fichiers clés :** `app/auth/callback/route.ts`, `app/[locale]/(auth)/connexion/page.tsx`, `lib/auth/urls.ts`

### 3.4 Anciens profils incomplets

Plusieurs comptes **Non membre** sans prénom/commune (inscription avant le nouveau formulaire), ex. `lacamillerie@gmail.com`, `jade.reebb@gmail.com`.  
À ne pas confondre avec les échecs récents.

---

## 4. Mobile vs desktop

**Constat :** le site n’est pas « cassé » sur mobile, mais **moins optimisé** que sur ordinateur.

**Déjà en place :**
- Menu burger < 900 px
- Grilles catalogue adaptées (`styles/pages.css`)
- Filtres catalogue scrollables horizontalement < 640 px
- Formulaire inscription : colonne étroite (max 480 px) — la capture Camille montre un rendu acceptable

**Points faibles probables :**
- Catalogue Biopartner (milliers de produits) : navigation en 3 niveaux, sticky catégories, panier
- Admin Joel sur téléphone (tableaux commandes)
- Cartes produit denses (prix, quantité, +/−)
- Pas de test systématique sur iPhone/Android récents

**Prochain chat :** audit mobile ciblé (inscription, confirmation e-mail, catalogue, panier) + corrections sur preprod.

---

## 5. Retours Joel + Marc (mail récent)

### 5.1 Nouveaux fournisseurs à ajouter (catalogue + import)

Tous ceux de la page **Producteurs**, plus :
| Nom | Type | Site |
|-----|------|------|
| Saldac | grossiste bio équitable | saldac.ch |
| Gebana | grossiste bio équitable | gebana.com/ch-fr |
| Dr Jacob's | compléments alimentaires | naturam.ch |
| Kumbha Sàrl | grossiste bio | bio-vitality.ch |

→ Travail : fiches fournisseurs, imports CSV/Excel, ouverture commandes, éventuellement logos.

### 5.2 Idées UX Marc (à discuter / prioriser)

| Idée | Commentaire |
|------|-------------|
| **Bioterroir : quantités par 0,25 kg** | Règles quantité dans import + `quantity-rules` — à clarifier si fichier Excel ou code |
| **Bandeau gauche : fournisseurs actifs** | Navigation catalogue — évite de revenir à la liste principale |
| **1 seule catégorie → ouvrir direct** | Saut d’écran pour petits producteurs locaux |
| **Page Adhésion : « Joel fixe le montant »** | Formulation à adoucir (Joel + Marc d’accord) |
| **Ciel : « 20 % de marge »** + texte cotisation annuelle légère | Clarifier les textes `membership` / `MemberStatusGuide` |
| **Choix statut + montant à l’inscription** | **Gros changement métier** : aujourd’hui Joel choisit seul ; Marc propose auto-déclaration + validation Joel |

**Mon avis (à valider avec l’asso) :**
- Textes adhésion / Ciel : **quick win**, on peut faire vite.
- Bandeau fournisseurs + catégorie directe : **bonnes idées UX**, effort moyen.
- Choix statut à l’inscription : **décision asso d’abord** (cotisation, trésorerie, fraude) — ne pas coder sans accord Joel + Marc.
- Nouveaux grossistes : **un par un** en preprod (import + test commande).

---

## 6. Règles de travail pour la suite (OBLIGATOIRE)

1. **Toujours expliquer** comme à une débutante : quoi, pourquoi, impact.
2. **Une étape à la fois** : proposer → j’approuve → tu codes → je teste en preprod → ensuite prod.
3. **Branche `staging`**, déploiement preprod, merge `main` seulement après mon OK.
4. **Ne pas commit/push** sans que je le demande.
5. Migrations Supabase : SQL manuel dans l’éditeur Supabase (pas de prod séparée pour l’instant).
6. Rappeler le risque **base partagée** avant tout test avec de vrais e-mails.

---

## 7. Pistes de travail ordonnées (proposition)

### Phase A — Urgent (inscriptions)
- [ ] Logs Vercel + reproduire échec Camille
- [ ] Messages d’erreur plus clairs (e-mail déjà utilisé, mot de passe, etc.)
- [ ] Corriger UX lien confirmation (message honnête, doc utilisateur)
- [ ] Vérifier URLs redirect Supabase Dashboard

### Phase B — Textes Marc / Joel
- [ ] Adhésion : cotisations, Ciel « 20 % de marge », enlever « Joel fixe »
- [ ] (Optionnel) page courte « Comment confirmer son e-mail »

### Phase C — Mobile
- [ ] Test inscription + catalogue + panier sur mobile
- [ ] Ajustements CSS si besoin

### Phase D — Évolutions métier
- [ ] Nouveaux fournisseurs (par priorité asso)
- [ ] Bandeau fournisseurs actifs
- [ ] Saut catégorie unique
- [ ] Bioterroir 0,25 kg
- [ ] (Si accord asso) choix statut à l’inscription

### Phase E — Technique future
- [ ] Séparer Supabase preprod / prod

---

## 8. Fichiers importants pour le debug inscription

```
app/api/auth/register/route.ts      ← création compte
app/[locale]/(auth)/inscription/page.tsx
app/auth/callback/route.ts          ← lien e-mail
lib/auth/urls.ts                    ← domaines autorisés
lib/members/registration.ts         ← validation formulaire
app/[locale]/(auth)/connexion/page.tsx  ← erreur lien_invalide
```

---

## 9. Capture jointe

Screenshot cliente : **Camille Aglione**, erreur *Impossible de créer le compte* — compte **absent** de Supabase → échec côté serveur au moment du signUp.

---

*Document généré pour handoff — juin 2026*
