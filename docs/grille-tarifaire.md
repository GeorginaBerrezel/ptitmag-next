# Grille tarifaire — Plateforme de commandes groupées

**Produit :** outil web sur mesure (catalogue multi-fournisseurs, adhérents, admin, emails)  
**Référence :** Le P'tit Mag — [ptitmag-next.vercel.app](https://ptitmag-next.vercel.app)  
**Prestataire :** Georgina Berrezel  
**Date :** mai 2026 · **Validité :** 6 mois

---

## En bref

| | **Pack Asso** | **Pack Pro / Collectivité** |
|---|:---:|:---:|
| **Public visé** | Associations, coopératives locales, AMAP | Mairies, PME, cantines, réseaux structurés |
| **Setup (one-shot)** | **CHF 4 500 – 6 500.–** HT | **CHF 12 000 – 20 000.–** HT |
| **Maintenance (optionnelle)** | **CHF 100 – 150.–** / mois | **CHF 150 – 250.–** / mois |
| **Délai indicatif** | 2 – 4 semaines | 4 – 8 semaines |

*TVA : 0 % si client association sans but lucratif (CH) — sinon 8,1 %.*

---

## Pack Asso — dupliquer & adapter

**Pour qui :** une association ou coopérative qui fonctionne comme Le P'tit Mag (commandes groupées chez plusieurs producteurs / grossistes).

### Inclus dans le setup

| Élément | Détail |
|---------|--------|
| Déploiement | Instance dédiée (Vercel + Supabase) |
| Personnalisation | Nom, logo, couleurs, textes FR/EN |
| Catalogue | Configuration fournisseurs, imports CSV/Excel |
| Espace adhérents | Inscription, connexion, panier, commandes |
| Admin | Commandes, membres, cotisations, imports |
| Emails | Confirmations de commande (adhérent + copie admin) |
| Formation | 1 session admin (~1 h 30), en visio ou sur place |
| Documentation | Guide gérant (PDF) |
| Garantie bugs | 3 mois après mise en ligne |

### Options (en supplément)

| Option | Prix indicatif (CHF HT) |
|--------|-------------------------|
| Asso supplémentaire du même réseau (clone allégé) | 3 500 – 4 500.– |
| Règle métier spécifique (ex. autre majoration, autre workflow) | 500 – 1 500.– / lot |
| Import initial des catalogues (fichiers fournis par le client) | 300 – 600.– |
| Session formation supplémentaire | 120.– / h |
| Domaine personnalisé (ex. `monasso.ch`) | 150.– setup + coût registrar |

### Maintenance mensuelle (recommandée)

| Inclus | **CHF 100 – 150.–** / mois |
|--------|----------------------------|
| Mises à jour de sécurité (stack Next.js, dépendances) | ✓ |
| Corrections de bugs | ✓ |
| Support email (délai réponse ~48 h ouvrées) | ✓ |
| Déploiements & surveillance basique | ✓ |
| Petites évolutions (< 1 h / mois cumulées) | ✓ |

*Hors maintenance : interventions facturées **CHF 120.–** / h (minimum 30 min).*

---

## Pack Pro / Collectivité — sur mesure

**Pour qui :** mairie, entreprise, cantine, réseau multi-sites avec exigences plus élevées (SLA, intégrations, reporting).

### Inclus dans le setup

| Élément | Détail |
|---------|--------|
| Tout le Pack Asso | ✓ |
| Atelier cadrage | 1 – 2 sessions (besoins, parcours, rôles) |
| Design & UX | Charte visuelle adaptée au client |
| Règles métier avancées | Sur devis (multi-sites, tarifs, workflows) |
| Documentation technique | Architecture, accès, procédures |
| Formation | 2 sessions (admin + utilisateurs clés) |
| Garantie bugs | 6 mois après mise en ligne |

### Exemples de surcharges fréquentes

| Besoin | Fourchette (CHF HT) |
|--------|---------------------|
| Multi-sites / multi-catalogues | +2 000 – 5 000.– |
| Intégration compta / export avancé | +1 500 – 4 000.– |
| Facturation adhérents intégrée | +2 000 – 6 000.– |
| SSO / authentification entreprise | +1 500 – 3 000.– |
| SLA prioritaire (réponse < 24 h) | +80.– / mois |

### Maintenance mensuelle

| Niveau | Prix | Inclus |
|--------|------|--------|
| **Standard** | **CHF 150.–** / mois | Bugs, mises à jour, support 48 h |
| **Prioritaire** | **CHF 250.–** / mois | + réponse 24 h, 2 h évolutions / mois |

---

## Comparatif marché suisse (transparence)

Estimation pour un outil **équivalent** développé par une agence web suisse :

| Poste | Agence classique | Pack Asso (Georgina) | Économie |
|-------|------------------|----------------------|----------|
| Développement initial | CHF 5 600 – 8 000.– | CHF 4 500 – 6 500.– | ~20 – 35 % |
| Maintenance / mois | CHF 180 – 250.– | CHF 100 – 150.– | ~30 – 45 % |
| Shopify / SaaS générique | 600 – 2 400.– / an | — | Non adapté aux commandes groupées multi-fournisseurs |

**Le P'tit Mag (premier client asso) :** CHF 3 200.– HT — tarif portfolio / première référence.  
**Prochains clients :** grille ci-dessus.

---

## Infrastructure (à la charge du client ou incluse)

| Service | Coût mensuel | Note |
|---------|--------------|------|
| Supabase (plan Free) | **0 CHF** | Suffisant pour ~50–300 membres actifs |
| Vercel (plan Hobby) | **0 CHF** | Suffisant pour trafic coopérative locale |
| Supabase Pro (si croissance) | ~25 CHF | Optionnel, prévisible |
| Vercel Pro (si besoin) | ~20 CHF | Optionnel |

*Possibilité de facturer l'hébergement en mandat (+15 CHF/mois de gestion).*

---

## Modalités de paiement

| Pack | Acompte | Solde |
|------|---------|-------|
| **Asso** | 40 % à la commande | 60 % à la mise en ligne |
| **Pro** | 30 % à la commande · 30 % mi-parcours | 40 % à la livraison |

*Devis écrit DEV-20XX-XXX avant tout engagement.*

---

## Propriété & code

- **Code source :** propriété transférée au client après paiement intégral (Pack Asso et Pro).
- **Stack :** Next.js, Supabase, Vercel — standards ouverts, exportables.
- **Données :** hébergées sur le compte Supabase du client (ou de l'association).

---

## Contact

**Georgina Berrezel**  
Email : *(à compléter)*  
Site de référence : [ptitmag-next.vercel.app](https://ptitmag-next.vercel.app)

---

*Document commercial — usage interne et envoi prospects. Non contractuel ; un devis signé fait foi.*
