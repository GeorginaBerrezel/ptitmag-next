# Workflow Git — Le P'tit Mag

**Pour :** Georgina · **Mis à jour :** juin 2026

Guide pas à pas pour coder, tester en préprod et mettre en prod en toute sécurité.

---

## Les 3 environnements

| Où | URL | Branche Git |
|---|---|---|
| Dev (local) | http://localhost:3000 | `feat/xxx`, `fix/xxx`… |
| Préprod | https://preprod.leptitmag.org | `staging` |
| Production | https://www.leptitmag.org | `main` |

Vercel déploie automatiquement : push/merge sur `staging` → préprod, sur `main` → prod.

---

## Schéma du flux (à chaque évolution)

```
1. feat/ma-feature     ← tu codes en local
        │
        ▼  PR #1
2. staging             ← preprod.leptitmag.org
        │  (test + ton OK)
        ▼  PR #2 (quand prêt pour prod)
3. main                ← www.leptitmag.org
        │
        ▼  tag vX.Y.Z (optionnel mais recommandé)
   point de rollback
```

---

## Étape par étape (copier-coller)

### 1. Partir de staging à jour

```bash
git checkout staging
git pull origin staging
```

### 2. Créer une branche de travail

Nom en **kebab-case** avec un préfixe :

| Préfixe | Usage | Exemple |
|---|---|---|
| `feat/` | nouvelle fonctionnalité | `feat/export-excel-admin` |
| `fix/` | correction de bug | `fix/panier-mobile-ios` |
| `chore/` | infra, config, CI | `chore/ci-github-actions` |
| `docs/` | documentation | `docs/workflow-git` |

```bash
git checkout -b feat/nom-descriptif
```

### 3. Coder et tester en local

```bash
npm run dev
```

Avant de pousser (optionnel mais utile) :

```bash
npm run lint
npm run typecheck
npm run build
```

### 4. Committer (Conventional Commits)

Format : `type(scope): description courte.`

Exemples déjà utilisés sur le projet :

- `feat(admin): récap commandes et totaux avoir.`
- `fix(catalogue): recherche mobile sans zoom iOS.`
- `chore(ci): lint, typecheck et build automatiques.`

```bash
git add .
git commit -m "feat(admin): description de ce que tu fais."
```

### 5. Pousser et ouvrir une PR vers staging

```bash
git push -u origin feat/nom-descriptif
```

Sur GitHub :

1. **Create pull request**
2. Base : **`staging`** (pas `main`)
3. Attendre la CI verte : **Lint, typecheck & build**
4. **Merge pull request**

### 6. Tester sur la préprod

Ouvrir https://preprod.leptitmag.org et vérifier le changement.

Checklist rapide :

- [ ] Desktop OK
- [ ] Mobile OK (375 px)
- [ ] Accessibilité (focus clavier, contrastes)
- [ ] Zones sensibles : pricing, commandes, imports → test manuel

### 7. Mettre en prod (quand preprod validée)

Sur GitHub :

1. **New pull request**
2. Base : **`main`** ← Compare : **`staging`**
3. CI verte → **Merge pull request**
4. Vérifier https://www.leptitmag.org

```bash
# En local, resynchroniser après merge :
git checkout main && git pull origin main
git checkout staging && git pull origin staging
```

---

## Tags de release (rollback)

Un **tag** = une étiquette sur un commit précis (« la prod telle qu’elle était ce jour-là »).

### Nommage

Format : `vMAJEUR.MINEUR.PATCH` (ex. `v1.0.0`, `v1.1.0`)

| Incrément | Quand |
|---|---|
| PATCH (`v1.0.1`) | petit fix sans nouvelle feature |
| MINEUR (`v1.1.0`) | nouvelle feature validée en prod |
| MAJEUR (`v2.0.0`) | gros changement structurel |

### Créer un tag après merge en prod

```bash
git checkout main
git pull origin main
git tag -a v1.1.0 -m "Description courte de cette release."
git push origin v1.1.0
```

### Rollback (revenir en arrière)

1. **Vercel** → Deployments → choisir le déploiement du tag/commit précédent → **Redeploy**
2. Ou merger un revert via PR (plus propre dans l’historique Git)

---

## Ce que GitHub vérifie automatiquement (CI)

À chaque PR vers `staging` ou `main`, GitHub Actions lance :

1. **Lint** — règles ESLint + Next.js + accessibilité React
2. **Typecheck** — TypeScript sans erreur
3. **Build** — le site se construit comme en prod

Si un check est **rouge** → ne pas merger. Lire le log, corriger, push → la CI se relance.

---

## Branches protégées (rulesets GitHub)

`main` et `staging` sont protégées :

- pas de push direct
- PR obligatoire
- CI verte obligatoire (`Lint, typecheck & build`)

---

## Règles importantes

- **Jamais** de push direct sur `main`.
- **Toujours** tester sur preprod avant prod.
- Preprod et prod **partagent Supabase** pour l’instant → éviter les vrais imports/commandes tests sur preprod (voir `docs/handoff-nouvelle-session.md`).
- Pas de commit/push/merge sans validation explicite de Georgina lors des sessions avec l’IA.

---

## Docs liées

- `docs/hebergement-et-deploiement.md` — DNS, Vercel, variables d’env
- `docs/handoff-nouvelle-session.md` — contexte projet pour nouvelles sessions IA
- `docs/guide-tests-preprod-juin2026.md` — checklist tests Joel
- `.cursor/rules/` — règles Cursor (WCAG, mobile, workflow)

---

## Aide-mémoire une ligne

```
feat/xxx → PR staging → test preprod → PR main → tag vX.Y.Z → prod OK
```
