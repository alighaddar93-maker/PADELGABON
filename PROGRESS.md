# Suivi des corrections — PadelGabon

Légende : [ ] à faire, [x] corrigé, [~] en cours, [-] reporté (besoin backend), [!] attend décision produit

## Critique (Critical)
- [x] C-1a  Bannière DEMO MODE ajoutée sur les 3 pages
- [-] C-1b  Mot de passe admin côté client → nécessite backend (Supabase Phase 1)
- [-] C-2   Pas de persistance → nécessite backend
- [-] C-3   Chaque page a sa propre DB → nécessite backend
- [-] C-4   Suppression d'un club corrompt les réservations → nécessite UUIDs + backend
- [x] C-5   Double notification réservation supprimée (index.html, admin.html, club.html)
- [x] C-6   Blocs <script> consolidés, ~80 fonctions dupliquées supprimées
- [-] C-7   Login joueur fictif → nécessite auth réelle (Phase 1)
- [-] C-8   Pas de paiement Mobile Money → nécessite PawaPay/Hub2 (Phase 2)
- [-] C-9   Pas de contrôle doublon côté serveur → nécessite backend PostgreSQL

## Haute priorité (High)
- [x] H-1   XSS via innerHTML — esc() ajouté, 48 champs protégés par fichier
- [x] H-2   Service Worker corrigé (mauvais fichiers en cache)
- [x] H-3   manifest.json corrigé (start_url + ajout sur admin/club)
- [x] H-4   Créneaux passés filtrés dans buildSlots()
- [-] H-5   Inscription tournoi no-op → nécessite backend
- [-] H-6   Réservation coach no-op → nécessite backend
- [x] H-7   Texte invitation fictif supprimé
- [x] H-8   Boutique — notice "contacter le club" ajoutée
- [-] H-9   i18n EN/FR incomplet → décision produit requise
- [x] H-10  Dates tournois en format ISO (startDate/endDate)
- [-] H-11  Référence club par nom au lieu d'ID → nécessite C-4

## Priorité moyenne (Medium)
- [x] M-1   Formatage monnaie XAF avec espace insécable (fmtXAF)
- [ ] M-2   Compression icônes PNG (à faire manuellement sur tinypng.com)
- [-] M-3   CSS/JS inline → extraction reportée après C-6
- [x] M-6   .gitignore créé

## Basse priorité (Low)
- [x] L-1   console.log de production supprimé
- [x] L-2   user-scalable=no supprimé (WCAG 1.4.4)
- [x] L-3   aria-label + icône ✕ sur les créneaux
- [x] L-4   Styles :focus-visible ajoutés
- [-] L-5   Labels aria et balises sémantiques → audit accessibilité complet requis

## Tests automatiques
- [x] 00-smoke.spec.js — 3/3 passés ✅
- [ ] C-05-duplicate-notification.spec.js
- [ ] H-04-past-time-slots.spec.js

## Score Lighthouse (à mesurer)
- [ ] Performance > 80
- [ ] Accessibilité > 90
- [ ] Bonnes pratiques > 90
