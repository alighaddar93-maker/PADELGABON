# 🔐 ÉTAPE 2 — Sécurité (vrais comptes + base verrouillée)

But : chaque utilisateur (joueur, club, admin) a un **vrai compte** email + mot de passe,
et la base est **verrouillée** pour que personne ne puisse supprimer/modifier ce qui ne le concerne pas.

Suis les étapes **dans l'ordre**. Ne saute pas l'ordre.

---

## 1) Créer la table des comptes/rôles
1. Supabase → **SQL Editor** → **New query**
2. Ouvre le fichier **`supabase-auth.sql`**, copie tout, colle, clique **Run**
3. Tu dois voir **Success**

## 2) Désactiver la confirmation par email (important)
1. Supabase → **Authentication** → **Providers** → **Email**
2. Trouve **« Confirm email »** et **DÉSACTIVE-le** → **Save**
   - (Sinon chaque joueur devrait confirmer un email avant de pouvoir se connecter = trop de friction.)

## 3) Créer TON compte admin
1. Ouvre l'**app joueur** (index.html / le site) → **Créer un compte**
2. Inscris-toi avec l'email que tu veux comme **admin** (ex : `toi@gmail.com`)
3. Reviens dans Supabase → **SQL Editor** et lance (remplace l'email) :
   ```sql
   update public.profiles set role='admin' where email='toi@gmail.com';
   ```
4. Va sur la **page Admin** → connecte-toi avec **cet email + mot de passe**

## 4) (Optionnel) Créer un compte pour un club
1. La personne du club crée un compte via l'app joueur (ou toi pour elle)
2. Récupère l'**UUID du club** : Supabase → Table Editor → `clubs` → colonne `id`
3. Lance (remplace email + uuid) :
   ```sql
   update public.profiles
      set role='club', club_id='COLLE-ICI-UUID-DU-CLUB'
    where email='club@gmail.com';
   ```
4. Le club se connecte sur la **page Club** avec **son email + mot de passe**

## 5) Verrouiller la base (à faire EN DERNIER)
> ⚠️ Fais ça seulement **après** avoir vérifié que tu arrives à te connecter
> (joueur + admin + club). Une fois verrouillé, seuls les bons rôles peuvent écrire.
1. Supabase → **SQL Editor** → ouvre **`supabase-rls.sql`** → colle → **Run** → **Success**

---

## ✅ Résultat
- Joueurs : s'inscrivent / se connectent, réservent, annulent **leur** réservation.
- Clubs : voient et gèrent **uniquement** les réservations de **leur** club.
- Admin : seul à pouvoir créer/modifier/supprimer clubs, tournois, coachs, pubs, magasins.

## ❓ Si une action est bloquée après le verrouillage
Vérifie le compte dans **Table Editor → `profiles`** : bon `role` ? bon `club_id` ?
