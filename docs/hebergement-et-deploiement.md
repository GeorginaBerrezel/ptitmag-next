# Hébergement, préprod et déploiement — Le P'tit Mag

**Pour :** Georgina (technique) · **Mis à jour :** 29 mai 2026

---

## État actuel ✅

| Élément | Valeur | Statut |
|---------|--------|--------|
| **Production** | [www.leptitmag.org](https://www.leptitmag.org) | ✅ En ligne |
| **Redirect apex** | `leptitmag.org` → `www.leptitmag.org` | ✅ Vercel |
| **DNS domaine** | Infomaniak (A + CNAME) | ✅ Valid Configuration |
| **Déploiement app** | Vercel, branche `main` | ✅ |
| **Données** | Supabase prod | ✅ |
| **Backup URL** | ptitmag-next.vercel.app | ✅ |
| **Préprod** | preprod.leptitmag.org | 🔲 À mettre en place (ci-dessous) |

### Variables prod (Vercel)

- `NEXT_PUBLIC_SITE_URL` = `https://www.leptitmag.org`

### Supabase prod

- **Site URL** = `https://www.leptitmag.org`
- **Redirect URLs** : inclure `www`, `leptitmag.org`, `ptitmag-next.vercel.app`, `localhost`

---

## DNS — pourquoi ça a été instantané

Infomaniak avait un **TTL de 5 minutes** sur les enregistrements web. J'avais indiqué « 15 min à 2 h » par prudence — c'est la fourchette **habituelle** quand :

- le TTL est à 1 h ou 24 h ;
- les FAI mettent du temps à rafraîchir leur cache ;
- c'est la première modification.

Chez vous, avec TTL 5 min + changement simple, **quelques minutes suffisent souvent**. Les deux affirmations sont vraies : ça *peut* être instantané, et ça *peut* parfois traîner.

---

## Architecture (3 environnements)

```
localhost:3000              → dev (Georgina)
preprod.leptitmag.org       → branche staging (test avant prod)
www.leptitmag.org           → branche main (adhérents + Joel)
```

| Brique | Rôle |
|--------|------|
| **GitHub** | Code source |
| **Vercel** | Héberge et déploie Next.js |
| **Supabase** | Données (membres, commandes, produits) |
| **Infomaniak DNS** | Domaine suisse `leptitmag.org` |

---

## Mise en place préprod — checklist

> Valider chaque étape avant la suivante. Pas de merge `staging` → `main` sans test sur preprod.

### Étape A — Branche Git `staging`

```bash
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

### Étape B — Vercel : domaine preprod

1. **Settings → Domains → Add Existing**
2. Domaine : `preprod.leptitmag.org`
3. **Edit** le domaine → lier à la branche **`staging`** (pas Production)
4. Noter le **CNAME** affiché par Vercel (valeur unique type `xxxx.vercel-dns-017.com`)

### Étape C — Infomaniak DNS

1. **Web & Domaines → Domaines → leptitmag.org → Zone DNS**
2. **Ajouter un enregistrement** :
   - Type : **CNAME**
   - Source : **`preprod`**
   - Valeur : le CNAME Vercel de l'étape B
   - TTL : 5 min
3. **Refresh** sur Vercel → Valid Configuration ✅

### Étape D — Variables Vercel (environnement Preview / staging)

Dans **Settings → Environment Variables**, pour l'environnement **Preview** (ou la branche staging selon l'UI) :

| Variable | Valeur preprod |
|----------|----------------|
| `NEXT_PUBLIC_SITE_URL` | `https://preprod.leptitmag.org` |
| Clés Supabase | voir étape E |

Redeploy la branche staging après modification.

### Étape E — Supabase (important)

**Option recommandée (avant tests membres) :** créer un **2ᵉ projet Supabase** « ptitmag-preprod » (plan Free) :

- Exécuter les migrations SQL (`supabase/migrations/*.sql`)
- Variables preprod pointent vers ce projet
- Données de test, pas les vrais membres

**Option temporaire (Georgina seule, tests visuels) :** réutiliser Supabase prod — **déconseillé** dès qu'on commande ou qu'on touche aux imports sur preprod.

Supabase preprod → **Authentication → URL Configuration** :

- Site URL : `https://preprod.leptitmag.org`
- Redirect URLs : `https://preprod.leptitmag.org/**`

### Étape F — Workflow quotidien

```
1. Coder en local
2. git push origin staging
3. Vercel déploie preprod.leptitmag.org
4. Tester (Georgina, puis membres pilotes si besoin)
5. git checkout main && git merge staging && git push
6. Vercel déploie www.leptitmag.org
```

**Règle :** plus de push direct sur `main` pour des changements non testés.

---

## Ce qu'on dit à Joel (réunion)

> « Le site officiel est **www.leptitmag.org**, domaine suisse Infomaniak. Quand on prépare une mise à jour importante, on la teste d'abord sur **preprod.leptitmag.org** avant de la mettre en ligne. Les emails restent chez Infomaniak. »

Joel **n'utilise pas** la préprod au quotidien — seulement si on lui demande de valider quelque chose.

---

## Dupliquer pour d'autres lieux (Pack Asso)

Par nouveau lieu :

- 1 domaine (ex. `autre-coop.ch`)
- 1 projet Supabase
- 1 déploiement Vercel (ou Infomaniak Node.js)
- Clone du code + personnalisation

Voir [grille-tarifaire.md](./grille-tarifaire.md).

---

## Rollback / backups

| Quoi | Comment |
|------|---------|
| Code | GitHub + branches |
| Site prod | Vercel → Deployments → Redeploy version précédente |
| Données | Export Supabase mensuel ; plan Pro = backups auto (~25 CHF/mois) |

---

*Document interne — ptitmag-next · mai 2026*
