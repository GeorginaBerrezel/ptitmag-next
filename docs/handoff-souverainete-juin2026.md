# Contexte handoff — Souveraineté, hébergement, duplication ptitmag-next

**Pour :** l’assistant IA (Cursor) · **Par :** Georgina · **Projet :** ptitmag-next (Le P'tit Mag + futurs clones Pack Asso)  
**Mis à jour :** juin 2026

> Coller ce document en début de session Cursor pour reprendre le sujet souveraineté / migration / duplication.

---

## 1. Projet en bref

- **Client référence :** Joel Azoo · info@leptitmag.org · association Le P'tit Mag (St-Romain, CH)
- **Produit :** plateforme web de commandes groupées (catalogue multi-fournisseurs, adhérents, panier, admin, imports Biopartner, emails)
- **Stack actuelle :** Next.js 16 · Supabase (auth + PostgreSQL + storage) · Vercel · GitHub · emails SMTP Infomaniak
- **Repo :** GeorginaBerrezel/ptitmag-next (GitHub privé)
- **URLs :**
  - Prod : https://www.leptitmag.org (branche `main`)
  - Préprod : https://preprod.leptitmag.org (branche `staging`)
  - Dev : localhost:3000
- **Workflow Git :** feat/fix/chore/docs → PR → staging → test preprod → PR → main (+ tag) → prod
- **Règle collab :** Georgina est débutante — vulgariser, plan numéroté, attendre « ok » / « go » avant commit / push / merge / DNS / Supabase / Vercel

---

## 2. Correction terminologique et mea culpa (juin 2026)

### Ce qu’on ne dit PLUS

- **« Éthique »** seul — trop vague, attaquable, ressemble au greenwashing
- **« Si les USA tombent, le site marche quand même »** — FAUX tant que app (Vercel) + BDD (Supabase cloud US) ne sont pas migrés. Le domaine suisse seul ne suffit pas.

### Ce qu’on dit MAINTENANT

| Terme | Usage |
|-------|-------|
| **Souverain / souveraineté** | L’asso garde la main : domaine, données, hébergement, export possible |
| **Hébergé en Suisse** | Factuel, vérifiable (Infomaniak datacenters CH) |
| **Données exportables** | PostgreSQL standard, pas de lock-in |
| **Indépendant** | Pas enfermé chez un géant US pour les données adhérents |
| **Respectueux de la vie privée** | RGPD / nLPD, données minimales |

### Greenwashing (définition retenue)

Donner l’**impression** d’être responsable / écolo / éthique **sans preuves concrètes**. D’où l’importance de mots vérifiables (pays du serveur, propriétaire du domaine, export BDD).

### Phrase com’ validée (Joel / prospects / sceptiques)

> « Le domaine et les emails sont suisses. Les données adhérents seront hébergées en Suisse, exportables, et le domaine reste à l’association. On sait où sont les données et qui les possède. »

### Mea culpa Georgina (à maintenir en com’)

Georgina a utilisé « éthique » par sincérité mais était **mal renseignée** sur le vocabulaire et sur ce qu’on pouvait affirmer. Le setup initial (Vercel + Supabase free) était un **bon choix pour démarrer**, pas du greenwashing intentionnel, mais **pas 100 % souverain**. Migration planifiée et documentée.

---

## 3. État actuel de l’hébergement (prod Le P'tit Mag)

| Brique | Prestataire | Juridiction | Statut | Notes |
|--------|-------------|-------------|--------|-------|
| Domaine `leptitmag.org` | Infomaniak | 🇨🇭 Suisse | ✅ | Appartient à l’asso. DNS A/CNAME → Vercel |
| Emails `@leptitmag.org` | Infomaniak SMTP | 🇨🇭 Suisse | ✅ | MX/TXT — **NE PAS TOUCHER** |
| Application Next.js | Vercel | 🇺🇸 USA | ⚠️ Compromis | Branche main → prod, staging → preprod |
| Base de données | Supabase cloud | 🇺🇸 Société US | ⚠️ Compromis | Auth + PostgreSQL + Storage. Région EU possible (Francfort/Paris) mais société reste US (CLOUD Act) |
| Code source | GitHub (Microsoft) | 🇺🇸 USA | ⚠️ | Atelier dev uniquement — PAS les données adhérents |
| Backup URL | ptitmag-next.vercel.app | Vercel | ✅ | |

### Supabase — usage technique dans le code

- Clients : `lib/supabase/client.ts`, `server.ts`, `admin.ts`
- Auth : inscription, connexion, callback `/auth/callback`, reset password
- Tables : profiles, orders, products, wishlist, etc.
- Storage buckets : `avatars`, `product-images`
- Variables env : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Migrations SQL : `supabase/migrations/*.sql`
- Emails auth : SMTP Infomaniak (pas Supabase email en prod)

### Point sensible actuel

**Preprod et prod partagent la MÊME base Supabase** (documenté dans handoffs). Risque pour tests / imports. Prévu : séparer en 2 projets Supabase.

### Admins autorisés

`lib/admin/access.ts` — info@leptitmag.org, georgina.berrezel@gmail.com

---

## 4. Objectif cible : 100 % souverain (test puis migration)

### Définition « 100 % souverain » pour ce projet

1. Domaine Infomaniak → asso
2. Emails Infomaniak → asso
3. App Next.js → Infomaniak (Node.js ou Public Cloud CH)
4. BDD + Auth + Storage → **Supabase auto-hébergé** sur serveur Infomaniak CH (open source, même API — pas de réécriture app)
5. Code → GitLab (Georgina a déjà un compte). GitLab.com = société US mais code ≠ données membres. Option future : GitLab self-hosted CH.

### Ce qu’on NE migre PAS en premier

- **Prod www.leptitmag.org** reste sur Vercel + Supabase cloud tant que le test souverain n’est pas validé.

### Architecture cible du TEST (clone séparé)

```
GitLab (EU)                    → code source du clone
Infomaniak domaine             → test.[domaine].ch (domaine déjà chez Infomaniak)
Infomaniak Public Cloud ~8 GB  → Docker + Supabase self-hosted (Postgres + Auth + Storage)
                               → Next.js app (même serveur OU Infomaniak Node.js séparé)
Infomaniak SMTP                → emails inscription + commandes
```

### Pourquoi Supabase self-hosted (et pas PostgreSQL Infomaniak managé seul)

- L’app est **profondément couplée** à Supabase (auth, RLS, storage, ~80+ fichiers utilisent supabase)
- PostgreSQL managé Infomaniak DBaaS : **PostgreSQL « bientôt disponible »** sur leur DBaaS (juin 2026) — pas prêt
- Self-host Supabase via Docker = garder le même code, changer uniquement URLs / clés env
- Prérequis Supabase self-host : min 4 GB RAM (dev), **8 GB recommandé** prod, 2–4 CPU, 40–80 GB SSD, Docker

### Infomaniak — tarifs retenus (indicatifs juin 2026)

| Poste | Prix |
|-------|------|
| Public Cloud 4 vCPU / 8 GB / 50 GB | ~16 CHF/mois |
| Crédits nouveaux comptes Public Cloud | 300 CHF / 3 mois |
| Hébergement Web Node.js (si app séparée) | ~11 CHF/mois (30 j essai) |
| Domaine | ~10–15 CHF/an (souvent déjà payé) |
| GitLab | 0 CHF (plan free) |
| **Total test** | **~16–27 CHF/mois** |

### Étapes migration test (ordre)

0. Choisir domaine test Infomaniak + repo GitLab clone
1. Créer instance Public Cloud Infomaniak 8 GB
2. Installer Docker + Supabase self-hosted (guide officiel supabase.com/docs/guides/self-hosting/docker)
3. Configurer : clés API, URL publique (ex. api.test.domaine.ch), SMTP Infomaniak pour auth emails
4. Exécuter migrations `supabase/migrations/*.sql` dans l’ordre
5. Créer buckets `avatars` + `product-images`
6. Déployer Next.js (même serveur ou Node.js hosting) avec variables env pointant vers Supabase CH
7. DNS Infomaniak : test.domaine.ch → app, api.test.domaine.ch → Supabase
8. HTTPS (Let’s Encrypt / Infomaniak auto)
9. Tests : inscription, connexion, catalogue, commande, admin, import
10. Importer subset catalogue (pas les vrais membres Le P'tit Mag)

### Variables env clone (rappel)

```
NEXT_PUBLIC_SUPABASE_URL=https://api.test.domaine.ch
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://test.domaine.ch
SMTP_HOST=... (Infomaniak)
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
ADMIN_EMAIL=...
```

---

## 5. GitLab vs GitHub (position retenue)

| | GitHub | GitLab |
|---|--------|--------|
| Société | Microsoft US | GitLab Inc. US |
| Données adhérents | Non | Non |
| Souveraineté | Faible | Légèrement mieux (EU hosting option) |
| Décision | Remplacer par GitLab pour clones + migration future | Georgina a déjà un compte |

**Réponse aux critiques :** « GitLab héberge le code de développement, pas les données adhérents. Les membres ne s’y connectent jamais. »

---

## 6. Duplication pour autres groupes (Pack Asso)

Documenté dans `docs/hebergement-et-deploiement.md` et `docs/grille-tarifaire.md`.

**Par nouveau lieu :**

- 1 domaine (Infomaniak)
- 1 projet Supabase (ou 1 Supabase self-hosted CH si voie souveraine)
- 1 déploiement app (Vercel ou Infomaniak)
- Clone code + personnalisation (nom, logo, couleurs, textes FR/EN, fournisseurs)
- Migrations SQL + import catalogue
- Formation admin ~1 h 30

**Catalogue similaire :** export / import tables produits possible entre instances. Membres et commandes séparés par instance.

**Grille tarifaire Pack Asso :** setup CHF 4 500–6 500 HT, maintenance CHF 100–150/mois, clone allégé même réseau CHF 3 500–4 500.

**Premier client (Le P'tit Mag) :** CHF 3 200 HT (tarif portfolio).

---

## 7. Réponses aux objections (antisèche)

| Objection | Réponse |
|-----------|---------|
| « C’était pas éthique avant » | Bon choix pour démarrer (gratuit, fiable). Vocabulaire corrigé. Migration en cours. |
| « GitLab/GitHub = US » | Code dev seulement. Données adhérents en Suisse après migration. |
| « L’IA c’est pas éthique » | IA = outil dev (Cursor). Production : aucune donnée adhérent ne passe par IA. Georgina review et maintient. |
| « Si USA tombe ? » | Après migration : site + BDD en CH. Seul GitLab (code) pourrait poser problème — copie locale + migrable. |
| « C’est compliqué/cher pour rien » | ~16 CHF/mois. Gouvernance des données vs Excel/clé USB ou SaaS US. |
| « Framasoft ? » | Stack open source (Next.js, PostgreSQL, Supabase OSS). Hébergement CH. Framasoft ne héberge pas ce type d’app métier. |
| « Greenwashing » | On dit « hébergé en Suisse » pas « éthique ». Vérifiable : registrar, IP serveur, export BDD. |

---

## 8. Ce qui reste « perfectible » même après migration 100 % CH

- GitLab.com = société US (code, pas données)
- Outils dev Georgina (Cursor/IA) = US, hors production
- Maintenance serveur self-hosted : ~1–2 h/mois (updates Docker, Supabase, OS)
- Supabase self-hosted = pas de backups auto comme cloud → prévoir exports / cron

---

## 9. Alternative intermédiaire (si 100 % CH bloque)

**Infomaniak Node.js + Supabase région Francfort + GitLab**

- ~11 CHF/mois, setup rapide (heures vs jours)
- Com’ : « App suisse, données en Europe » — PAS 100 % suisse juridiquement (CLOUD Act Supabase Inc.)
- Georgina préfère tester directement le 100 % souverain (self-host Supabase CH)

---

## 10. Docs projet à consulter

- `docs/hebergement-et-deploiement.md` — infra, DNS, duplication
- `docs/grille-tarifaire.md` — Pack Asso, coûts infra
- `docs/handoff-nouvelle-session.md` — handoff général + phrase souveraineté originale
- `docs/workflow-git.md` — branches, PR, tags
- `.cursor/rules/ptitmag-project.mdc` — règle « Vercel = compromis, migrable Infomaniak Node.js »
- `ENV.example` — variables env

---

## 11. Phrase bouclier (confrontation)

> « On ne prétend pas être parfaits. On prétend savoir où sont nos données, qui les possède, et pouvoir les rapatrier demain si l’asso le décide. »

---

## 12. Prochaines actions (quand Georgina dira « go »)

- [ ] Confirmer nom de domaine test Infomaniak
- [ ] Confirmer si compte Public Cloud Infomaniak existe déjà
- [ ] Créer repo GitLab clone
- [ ] Phase 1 : serveur + Supabase self-hosted
- [ ] Phase 2 : deploy Next.js + variables env
- [ ] Phase 3 : DNS + tests
- [ ] Ne PAS toucher prod leptitmag.org pendant le test
- [ ] Attendre « ok » avant toute action DNS / Infomaniak / commit

---

## 13. Messages déjà rédigés pour Georgina (juin 2026)

- Mail complet souveraineté (mea culpa « éthique », état actuel, cible, coûts, objections) — envoyé par email
- Version Messenger courte (tutoiement) — résumé pour accompagner le mail

---

*Handoff souveraineté — ptitmag-next — juin 2026 — à coller en début de session Cursor*
