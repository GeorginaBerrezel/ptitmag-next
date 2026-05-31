# Photos Biopartner — guide pas à pas

**Pour :** Georgina (une fois, depuis ton Mac)  
**Durée estimée :** 2–4 h pour compresser les 233 marques · upload ~15 min  
**Résultat :** photos visibles dans le catalogue (n° article Biopartner)

---

## Structure du Swiss Transfer (25 Go)

**Pas besoin d’extraire le gros zip manuellement.** Il contient **233 fichiers `.zip` par marque** :

```
swisstransfer_xxxxx.zip
  Allos.zip
    300136113_p_001.jpg   ← photo packshot
    300136113_y_001.jpg   ← variante (ignorée si _p_ existe)
  Biofarm.zip
  …
```

Le **n° au début** (`300136113`) = colonne **Article** du CSV Biopartner.

---

## Prérequis

- Zip téléchargé dans `~/Downloads/`
- `.env.local` avec `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
- **~10 Go libres** (sortie WebP ~1–2 Go ; pas d’extraction complète du zip 25 Go)
- Mac branché sur secteur

---

## Étape 1 — Scanner (30 secondes)

```bash
cd ~/Documents/ptitmag-next
npm install
npm run biopartner:import -- ~/Downloads/swisstransfer_XXXXX.zip --scan
```

Tu dois voir **233 marques** et des exemples du type `300136113 ← 300136113_p_001.jpg`.

---

## Étape 2 — Compression WebP (2–4 h)

**Lancer dans le Terminal et laisser tourner** (ne pas fermer la fenêtre) :

```bash
npm run biopartner:import -- ~/Downloads/swisstransfer_XXXXX.zip
```

- Sortie : `./biopartner-webp/` (~1–2 Go)
- Traite **marque par marque** sans extraire tout le zip d’un coup
- Préfère les photos `_p_` (packshot) aux `_y_`

**Test rapide (3 marques)** :

```bash
npm run biopartner:import -- ~/Downloads/swisstransfer_XXXXX.zip ./biopartner-webp-test --limit 3
```

---

## Étape 3 — Test upload (optionnel)

```bash
npm run biopartner:upload -- ./biopartner-webp-test --dry-run
npm run biopartner:upload -- ./biopartner-webp-test
```

Vérifie un produit sur le site (ex. article `200003129`).

---

## Étape 4 — Upload complet

```bash
npm run biopartner:upload -- ./biopartner-webp
```

- Crée le bucket Supabase `product-images` si besoin
- Chemin : `biopartner/{n° article}.webp`
- Relançable (upsert)

---

## Vérification

Catalogue → Biopartner → produit avec n° article connu.  
Placeholder gris = pas de photo pour cet article (normal pour une partie du catalogue).

---

## En cas de problème

| Problème | Solution |
|----------|----------|
| Script introuvable | `git pull` sur le projet |
| Upload 403 | Vérifier `SUPABASE_SERVICE_ROLE_KEY` |
| Photo absente | Article sans photo dans le Swiss Transfer |
| Import très long | Normal — laisser tourner plusieurs heures |

*Guide — Le P'tit Mag · mai 2026*
