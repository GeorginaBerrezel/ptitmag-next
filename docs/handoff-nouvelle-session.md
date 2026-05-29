# Handoff — nouvelle conversation Cursor (Le P'tit Mag)

**Usage :** copie la section **« Bloc à coller »** ci-dessous au début d'une nouvelle conversation avec l'agent Cursor.

---

## Bloc à coller (nouvelle conversation)

```
Projet : ptitmag-next — plateforme commandes groupées pour l'association Le P'tit Mag (St-Romain, CH).
Client : Joel Azoo · info@leptitmag.org · domaine leptitmag.org chez Infomaniak.

Stack : Next.js 16 · Supabase (auth + PostgreSQL) · Vercel · GitHub privé GeorginaBerrezel/ptitmag-next.

URLs live :
- Prod : https://www.leptitmag.org (branche main, DNS Infomaniak → Vercel)
- Préprod : https://preprod.leptitmag.org (branche staging)
- Backup : https://ptitmag-next.vercel.app

Workflow obligatoire :
1. Coder en local (npm run dev)
2. git push origin staging → test preprod
3. Valider avec moi étape par étape AVANT commit/push/merge
4. merge staging → main seulement après OK

Règles pour m'expliquer :
- Je suis débutante — vulgarise, une étape à la fois, attends ma validation avant d'exécuter (commit, push, DNS, Supabase).
- Ne pas over-engineer. Minimiser le scope. Pas de commit sauf demande explicite.
- Joel tient à l'éthique / open source (Framasoft) : domaine suisse Infomaniak OK ; Vercel (USA) pour déploiement = compromis documenté, migrable vers Infomaniak Node.js plus tard.

Docs repo :
- docs/guide-joel.md — guide gérant (Joel)
- docs/compte-rendu-joel.md — livrables + phases 28 mai
- docs/hebergement-et-deploiement.md — infra, DNS, préprod
- docs/grille-tarifaire.md — tarifs Pack Asso / duplication autres lieux

Admin : info@leptitmag.org + georgina.berrezel@gmail.com (lib/admin/access.ts)

Vercel env (2 lignes NEXT_PUBLIC_SITE_URL) :
- Production → https://www.leptitmag.org
- Preview → https://preprod.leptitmag.org

Infomaniak DNS (leptitmag.org) — ne pas toucher MX/TXT email :
- @ A → 216.198.79.1
- www CNAME → 9f73f5097c0e7174.vercel-dns-017.com
- preprod CNAME → 9f73f5097c0e7174.vercel-dns-017.com

À faire plus tard (pas bloquant réunion Joel) :
- Projet Supabase séparé pour preprod (avant tests membres réels)
- Confirmer migrations SQL prod exécutées (20260528_supplier_orders.sql, 20260528_biopartner_catalogs.sql)
- Cosmétique : email « lien expiré », logos fournisseurs
- Maintenance optionnelle 120 CHF/mois proposée à l'asso

Devis DEV-2026-001 : CHF 3 200 HT · site livré · régularisation en cours.

Contexte réunion Joel : montrer www.leptitmag.org + admin, envoyer guide-joel.md, expliquer préprod sans le faire utiliser au quotidien.
```

---

## Récap technique (pour l'agent)

### Architecture

```
GitHub (ptitmag-next)
├── main     → Vercel Production → www.leptitmag.org
└── staging  → Vercel Preview    → preprod.leptitmag.org

Supabase prod ← les deux environnements pointent dessus pour l'instant (attention commandes/imports sur preprod)
Infomaniak   ← DNS domaine + emails MX (mta-gw.infomaniak.ch)
```

### Fonctionnalités livrées (vérifiées code)

- Auth, reset mot de passe, emails commande
- Catalogue ~2000 produits, fournisseurs → catégories → produits
- +20 % non cotisés, +10 % Biopartner UC (lib/catalog/pricing.ts)
- Joel ouvre/ferme commandes par fournisseur (orders_open, order_deadline)
- 4 catalogues Biopartner, découpe CSV, imports locaux incrémentaux
- Masquer produits locaux en admin
- Cotisations, suppression compte, admin Joel (info@leptitmag.org)
- FR/EN, mobile, scroll #app-scroll

### Commits récents importants

- `65dc2bc` — docs Joel + domaine + fix resync cotisation MemberPricingContext
- `73944f0` — chore staging deploy preprod (branche staging)

### Migrations SQL (supabase/migrations/)

- 20260524_cotisations.sql
- 20260524_account_delete.sql
- 20260528_supplier_orders.sql — commandes ouvertes Joel
- 20260528_biopartner_catalogs.sql — 4 catalogues Biopartner

→ Vérifier exécution en prod Supabase si pas déjà fait.

### Comment travailler avec Georgina

1. **Proposer** le plan en étapes numérotées
2. **Attendre** « ok » / « go » avant commit, push, merge, DNS
3. **Une étape à la fois** — pas tout en même temps
4. **Contradire** si une idée est risquée (ex. push main direct, preprod sur Supabase prod avec vraies commandes)
5. Pas de doc markdown non demandée ; pas de commit non demandé

### Phrase éthique pour Joel (Vercel + Infomaniak)

> Domaine suisse à l'asso (Infomaniak). Code sur mesure, données exportables PostgreSQL. Déploiement Vercel gratuit et fiable aujourd'hui ; rapatriement hébergement Suisse possible si l'asso le souhaite.

---

*Handoff généré le 29 mai 2026 — après mise en prod leptitmag.org + préprod.*
