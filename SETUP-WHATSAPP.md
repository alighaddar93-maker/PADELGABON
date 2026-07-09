# 📲 Confirmation WhatsApp (V3-P4) — guide d'activation

Le code est **déjà branché**. Tant que tu n'as pas fait ces étapes, ça ne fait
**rien** (aucune erreur, aucun envoi). Quand tu actives, le joueur reçoit un
WhatsApp de confirmation après chaque réservation (canal qui marche **app fermée**).

## Pré-requis
- Un compte **WhatsApp Business API** (Meta Cloud API) → un **token** + un **phone number id**.
  (alternative plus simple à mettre en place : un fournisseur comme 360dialog/Twilio ;
  il faudra adapter l'appel dans `supabase/functions/whatsapp-booking/index.ts`.)
- Le **CLI Supabase** installé.

## Étapes
1. Mets les secrets côté serveur (jamais dans l'app) :
   ```
   supabase secrets set WHATSAPP_TOKEN=ton_token WHATSAPP_PHONE_ID=ton_phone_id APP_ORIGIN=https://padel-gabon.netlify.app
   ```
   (La fonction est sécurisée V4-01 : elle exige le jeton du joueur connecté et
   vérifie que la réservation lui appartient avant d'envoyer. Le client n'envoie
   que `reservation_id`.)
2. Déploie la fonction :
   ```
   supabase functions deploy whatsapp-booking
   ```
   Supabase te donne une URL, du genre :
   `https://<projet>.functions.supabase.co/whatsapp-booking`
3. Mets cette URL dans **`config.js`** :
   ```js
   window.PADELGABON_CONFIG = { ...,
     whatsappEndpoint: 'https://<projet>.functions.supabase.co/whatsapp-booking'
   };
   ```
4. Re-déploie l'app (Netlify). C'est tout.

## Comment ça marche
- À la réservation, l'app appelle l'Edge Function avec le numéro + les détails.
- L'Edge Function (qui détient le token) envoie le WhatsApp via l'API Meta.
- Si l'endpoint n'est pas configuré → l'app n'appelle rien (no-op).

## Rappels / T-2h (étape suivante)
Pour les **rappels** avant le match, il faudra une tâche planifiée (cron Supabase)
qui appelle la même logique pour les réservations à venir. Non inclus ici.
