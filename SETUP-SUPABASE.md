# 🚀 Étape 1 — Activer la base de données en ligne (Supabase)

But : que tous les téléphones (joueurs + clubs + admin) voient **les mêmes données** en temps réel.

---

## ✅ Ce que TOI tu dois faire (5–10 min, une seule fois)

### 1. Avoir un projet Supabase
- Va sur **https://supabase.com** → connecte-toi (ou crée un compte gratuit).
- Si tu n'as pas encore de projet : **New project** (choisis un nom, un mot de passe de base, une région proche).

### 2. Récupérer tes 2 clés
Dans ton projet → **Project Settings → API** :
- **Project URL** (ex: `https://xxxx.supabase.co`)
- **anon public** key (la clé publique)

### 3. Les mettre dans le fichier `config.js`
Ouvre `config.js` (sur ton ordinateur) et mets tes vraies valeurs :
```
supabaseUrl: 'TON_PROJECT_URL',
supabaseKey: 'TA_CLE_ANON_PUBLIC',
```
*(Ce fichier reste sur ton ordi, il n'est jamais publié.)*

### 4. Créer les tables
Dans Supabase → **SQL Editor → New query** :
- Ouvre le fichier **`supabase-schema.sql`**, copie **tout** son contenu, colle-le, clique **Run**.
- Tu dois voir « Success ». ✅ Tes tables sont créées.

### 5. Me dire « c'est fait »
Quand les 4 points ci-dessus sont OK, dis-le moi.

---

## 🔧 Ce que MOI je fais ensuite (le code)
- Connecter **toutes les écritures** à Supabase (créer club, réserver, annuler, coachs, tournois, notifications, photos…).
- Garder une **sauvegarde locale** de secours si Internet coupe.
- Activer la **synchro temps réel** (le club voit la réservation arriver en direct).
- On teste ensemble sur **2 téléphones**.

---

## ℹ️ Bon à savoir
- 💸 **Gratuit** pour démarrer (le plan gratuit Supabase suffit largement au début).
- 🔒 Pour l'instant la sécurité est en mode « ouvert » (MVP). On la **renforce à l'étape 2** (vrais comptes / mots de passe).
- 🎨 On peut **continuer à changer le design** à tout moment, ça n'a aucun impact sur la base.
