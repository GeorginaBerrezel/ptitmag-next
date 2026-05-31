# Photos Biopartner — guide pas à pas

**Pour :** Georgina (une fois, depuis ton Mac)  
**Durée estimée :** 30–90 min selon la taille du Swiss Transfer  
**Résultat :** photos visibles dans le catalogue Biopartner (n° article = nom du fichier)

---

## Avant de commencer

- Mac branché sur secteur (gros téléchargement + compression)
- `.env.local` à jour avec `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
- Espace disque : prévoir **2× la taille du Swiss Transfer** (brut + WebP compressés)

---

## Étape 1 — Télécharger le Swiss Transfer

1. Ouvre le **lien Swiss Transfer** (celui que Joel t’a envoyé) dans **Chrome** ou **Safari**
2. Clique **Télécharger tout** (ou équivalent)
   - Si plusieurs fichiers : laisse tout se télécharger dans `~/Downloads`
3. Si c’est un **.zip** :
   - Double-clique pour l’extraire
   - Renomme le dossier en `biopartner-photos-raw` pour t’y retrouver
4. Place-le idéalement ici :
   ```
   ~/Downloads/biopartner-photos-raw/
   ```

### Vérifier les noms de fichiers

Ouvre le dossier et regarde quelques noms. Ça doit ressembler à :

| OK | Pas OK |
|----|--------|
| `12345.jpg` | `photo_pomme.jpg` (pas de n°) |
| `12345_pomme.jpg` | `IMG_0836.jpg` |
| `67890.webp` | |

Le script lit le **n° au début du nom** — c’est le **N° article Biopartner** (= `supplier_ref` dans le catalogue).

> Si les fichiers ont un autre format de nom, dis-le à Georgina (Cursor) avant de lancer la compression — on adaptera le script.

---

## Étape 2 — Installer sharp (une seule fois)

Dans le dossier du projet :

```bash
cd ~/Documents/ptitmag-next
npm install
npm install sharp --save-dev
```

---

## Étape 3 — Compression WebP

```bash
npm run biopartner:compress -- ~/Downloads/biopartner-photos-raw
```

- Sortie par défaut : `./biopartner-webp/` dans le projet
- Chaque image → **600 px max**, WebP ~30–80 Ko
- Nom de sortie : `{n° article}.webp` (ex. `12345.webp`)

**Messages normaux :**
- `⚠ Ignoré` = fichier sans n° article au début
- `⚠ Doublon` = deux photos pour le même n° (la dernière écrase la précédente)

**Contrôle rapide :**
```bash
ls biopartner-webp | wc -l
```
Tu devrais avoir des centaines / milliers de `.webp`.

---

## Étape 4 — Test à blanc (upload)

```bash
npm run biopartner:upload -- ./biopartner-webp --dry-run
```

Vérifie qu’il n’y a pas d’erreur `.env.local`.

---

## Étape 5 — Upload Supabase Storage

```bash
npm run biopartner:upload -- ./biopartner-webp
```

- Crée le bucket **`product-images`** (public) s’il n’existe pas
- Chemin Storage : `biopartner/12345.webp`
- **Upsert** = relancer le script met à jour sans doublons

Durée : ~5–15 min pour ~1500 images.

---

## Étape 6 — Vérifier sur le site

1. Va sur **www.leptitmag.org** → Catalogue → Biopartner (Général)
2. Cherche un produit dont tu connais le n° article
3. La photo doit apparaître à gauche de la carte ; sinon placeholder gris (photo manquante ou mauvais n°)

**Test URL directe** (remplace `XXX` et ton URL Supabase) :
```
https://TON_PROJECT.supabase.co/storage/v1/object/public/product-images/biopartner/XXX.webp
```

---

## En cas de problème

| Problème | Solution |
|----------|----------|
| Swiss Transfer expiré | Redemander le lien à Joel |
| Peu d’images converties | Vérifier le format des noms de fichiers |
| Upload échoue (403) | Vérifier `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` |
| Photo ne s’affiche pas | N° article fichier ≠ n° dans le catalogue CSV |
| Bucket déjà existant | Normal — le script réutilise le bucket |

---

## Phase 2 (optionnel)

- Uploader seulement **une catégorie** d’abord (sous-dossier du Swiss Transfer)
- Relancer `compress` + `upload` quand Joel envoie de nouvelles photos
- Plus tard : séparer preprod / prod Supabase (projet dédié)

---

## Côté code (déjà en place)

- `lib/catalog/product-image.ts` → URL Storage par `supplier_ref`
- `ProductCard` → placeholder si photo absente
- Scripts : `scripts/biopartner-images-compress.mjs`, `scripts/biopartner-images-upload.mjs`

*Guide — Le P'tit Mag · mai 2026*
