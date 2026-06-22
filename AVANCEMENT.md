# 📌 PADELGABON — Où on en est (note de reprise)

> **À l'IA / nouvelle session :** lis ce fichier puis continue le travail. Le code est dans ce dossier.

## C'est quoi le projet
App PWA de réservation de padel au Gabon. **3 pages** :
- `index.html` = app joueur
- `admin.html` = panneau Super Admin (propriétaire) — mot de passe `padel2026`
- `club.html` = panneau club (chaque club a son **code d'accès** propre)

Style : **dark, fond uniforme `#1A1F26`, accents OR `#A58D66`, texte blanc**. Pas de fausses données.

## Comment lancer / tester
- Ouvrir les fichiers HTML dans le navigateur (ou via le site Netlify).
- Tests : `npx playwright test --project="Pixel 7"` (13 tests, doivent tous passer).
- Après chaque modif visible : bump du cache dans `sw.js` (`padelgabon-vXX`).
- Les tests mettent `localStorage pg_no_sb=1` pour NE PAS toucher la vraie base Supabase.

## Base de données (Supabase) — ÉTAPE 1 EN COURS
- Projet Supabase : `padelgabonapp` (URL `https://qsdlliiktzsduufpbrte.supabase.co`).
- Clés dans `config.js` (local) ET en secours dans `supabase-client.js` (clé publique, OK).
- Schéma SQL : `supabase-schema.sql`. Correctifs colonnes : `supabase-all-columns.sql` (déjà lancé = Success).
- ✅ **FAIT** : création + modification de **club** se synchronisent dans Supabase (testé, le club apparaît dans la table `clubs`).
- ✅ Connexion détectée même si base vide (corrigé le blocage « œuf/poule » : `sbLoaded=true` si la requête réussit).

## ⏭️ PROCHAINES ÉTAPES (dans l'ordre)
1. ✅ **Réservations** : FAIT — booking→Supabase, club lit+auto-refresh 15s+realtime, annulation club→Supabase, joueur voit créneaux pris. (Nécessite `supabase-all-columns.sql` lancé pour les colonnes `reservations`.)
2. ✅ **Tournois + inscriptions** : FAIT — admin.addTournament→sbAddTournament (avec colonne `club_name`), index.submitTrnForm→sbRegisterTournament, index charge les tournois depuis Supabase. (Nécessite `supabase-all-columns.sql` re-lancé pour la colonne `club_name`.)
3. ✅ **Coachs** : FAIT — admin.addCoachInd→sbAddCoach (colonne `clubs` jsonb), index charge via sbLoadCoachesInd → DB.coaches. (Nécessite `supabase-all-columns.sql` re-lancé pour `clubs`.)
4. ✅ **Photos/abo club** : rebranchés.
5. ✅ **Pubs / Magasins (+ produits) / Joueurs** : FAIT — table unique `app_lists` (JSON par clé) via `sbSaveList`/`sbLoadList`. Admin et joueur sauvent + chargent depuis Supabase. (Nécessite **`supabase-lists.sql`** lancé une fois pour créer la table `app_lists`.)
6. ✅ Édition + suppression coach/tournoi → sync (sbUpdateCoach/sbDeleteCoach/sbDeleteTournament branchés).

### ✅ BLOC 1 (sync en ligne) = TERMINÉ
Tout se synchronise maintenant entre téléphones : clubs, réservations, tournois+inscriptions, coachs, pubs, magasins+produits, joueurs.
**SQL à lancer une fois** (SQL Editor → Run) : `supabase-all-columns.sql` PUIS `supabase-lists.sql`.

## ⚠️ IMPORTANT — colonnes Supabase
À chaque table neuve d'erreur "column not found" : lancer **`supabase-all-columns.sql`** (idempotent, sans risque). Il couvre toutes les colonnes de toutes les tables (clubs, reservations, tournaments[+club_name], coaches[+clubs jsonb], etc.).

## 🔐 ÉTAPE 2 — SÉCURITÉ (vraie auth + RLS) — ✅ TERMINÉE (testée en ligne)
Choix du proprio : **tout le monde a un vrai compte** (email + mot de passe Supabase Auth), joueurs inclus.
- ✅ SQL lancés : `supabase-auth.sql` (profiles+rôles), `supabase-lists.sql` (app_lists), `supabase-rls.sql` (verrouillage). Tous = Success.
- ✅ « Confirm email » désactivé. Admin promu (`role='admin'`).
- ✅ Accès club créable **depuis l'admin** (fiche club → « 👤 Accès club ») via `sbCreateClubAccount` (client secondaire pour ne pas déconnecter l'admin). Pas besoin d'aller dans Supabase.
- ✅ Admin en ligne = SEUL l'email admin entre (mot de passe `padel2026` ne marche plus qu'en local/tests).
- ✅ Testé en prod : admin modifie club, joueur réserve+annule, club annule → OK.
- Déployé sur Netlify : https://tubular-dodol-2803cb.netlify.app (admin = /admin.html, club = /club.html).
- ✅ Code branché sur les 3 pages :
  - Joueur (`index.html`) : inscription/connexion via Supabase Auth (repli local si hors-ligne/tests). Session restaurée au démarrage (saute le splash).
  - Admin (`admin.html`) : connexion email + mot de passe, vérifie `role='admin'`. Repli mot de passe `padel2026` hors-ligne/tests.
  - Club (`club.html`) : connexion email + mot de passe, vérifie `role='club'` + `club_id`. Repli sélection+code hors-ligne/tests.
  - `supabase-client.js` : helpers `sbSignUp/sbSignIn/sbSignOut/sbGetUser/sbGetProfile/sbResetPassword` + session persistée.
  - Réservations : `user_id` marqué à la création (pour annulation par le joueur sous RLS).
- ⚙️ **SQL à lancer (dans l'ordre)** : `supabase-auth.sql` (table `profiles` + rôles), PUIS — une fois la connexion testée — `supabase-rls.sql` (verrouillage par rôle).
- ⚙️ **Dans Supabase** : Authentication → Providers → Email → DÉSACTIVER « Confirm email » (sinon friction inscription).
- ⚙️ **Promouvoir l'admin** : crée ton compte via l'app joueur, puis `update profiles set role='admin' where email='...';`
- ⚙️ **Rattacher un club** : `update profiles set role='club', club_id='<uuid>' where email='...';`
- ⏳ RESTE : tester les connexions en ligne sur téléphone, puis appliquer `supabase-rls.sql`.

## 🔔 ÉTAPE 4 — NOTIFICATIONS (in-app d'abord) — EN COURS
Décision proprio : Étape 3 (paiement) ANNULÉE — réservations payées sur place, magasin = vitrine.
Notifs « in-app » (cloche) maintenant ; push « téléphone vibre app fermée » → à l'Étape 5 (surtout iPhone).
- Table en ligne `notifications` (audience: all_players | admin | user | club). SQL : **`supabase-notifs.sql`** (à lancer).
- `supabase-client.js` : `sbPushNotif`, `sbLoadMyNotifs`, `sbWatchMyNotifs` (+ realtime).
- ✅ FAIT (création + affichage joueur) :
  - #4 Club annule une résa → 🔔 tous les joueurs (créneau libéré) — `club.html cpCancelResa`.
  - #5 Admin crée un tournoi → 🔔 tous les joueurs — `admin.html addTournament`.
  - #6 Joueur s'inscrit tournoi → 🔔 tous les joueurs + admin — `index.html submitTrnForm`.
  - Centre de notifs joueur (`p-notifs`) affiche les notifs en ligne + badge + temps réel + "vu" (pg_seen_notif_ts).
  - #1 Réservation et #3 Annulation joueur → club : déjà via `club_notifications` (existant).
- ✅ Affichage admin : carte « 🔔 Notifications » en haut de l'admin (loadAdminNotifs + temps réel + badge + "tout marquer lu").
- ✅ #2 Invitations EN LIGNE : `addToPlayersList` stocke `uid` ; `doRegister` le passe ; `submitInvite` → `sbPushNotif(audience='user', target_user_id=uid)`. Le joueur invité reçoit la notif sur son téléphone (avec date/heure/club/téléphone de l'inviteur). (Note : accept/décliner reste local pour l'instant ; la notif + le contact suffisent pour répondre.)
- ⏳ RESTE (mineur) :
  - #6 notifier aussi le club organisateur (besoin tournoi↔club_id — pas critique).
  - Push « téléphone vibre app fermée » → Étape 5 (publication).

## ⏭️ APRÈS
- Étape 5 : push natif (Capacitor + FCM), emballer en app iOS/Android, comptes stores, publication.

## Déploiement (pour tester sur téléphone)
- Glisser-déposer le dossier sur **Netlify** → ça donne un lien `.netlify.app`.
- ⚠️ **Re-déposer le dossier à chaque modif du code** (sinon le téléphone garde l'ancienne version).

## Fichiers SQL utiles (dans le dossier)
- `supabase-schema.sql` = schéma complet (création initiale).
- `supabase-all-columns.sql` = ajoute toutes les colonnes manquantes (sans risque). **Déjà passé = Success.**
- `supabase-reset.sql` = recrée tout proprement (efface les tables vides). À éviter s'il y a des données.

## État des fonctions (toutes testées en local)
Réservation, annulation joueur+club, photos (club/profil/tournoi/pub), recadrage manuel, stats réelles profil, revenu admin réel (abo par club), invitations avec photo, code d'accès par club (longueur libre), filtres joueurs.
