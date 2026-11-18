# 🤖 Bot Discord "Relais de MP" (ModMail piloté par le Staff)

Bot Discord autonome et modulaire développé en **Node.js** avec **discord.js v14** et **SQLite via better-sqlite3**.

Le bot fonctionne selon le principe d'un **ticket initié par le staff** :
1. Le staff lance une prise de contact via `/dm <membre>`.
2. Le bot transmet le message en MP au membre et crée un fil privé de discussion dans le salon staff.
3. Le membre répond en MP, le bot relaie ses messages et pièces jointes dans le fil.
4. Le staff répond dans le fil, le bot relaie en MP au membre.
5. **Le membre et le staff ne communiquent jamais en direct : tout passe par le bot.**

---

## 📁 Arborescence du Projet

```text
bot_mp/
├── .env.example               # Modèle des variables d'environnement
├── .gitignore                 # Exclusion de node_modules, .env et bases SQLite
├── package.json               # Dépendances et scripts de lancement
├── README.md                  # Documentation complète en français
├── src/
│   ├── index.js               # Point d'entrée principal (Client Discord, Intents, Partials)
│   ├── config.js              # Chargement et validation de la configuration .env
│   ├── database/
│   │   ├── db.js              # Initialisation SQLite better-sqlite3 (mode WAL)
│   │   ├── conversations.js   # Requêtes des conversations actives et passées
│   │   ├── messages.js        # Historique des messages et pièces jointes
│   │   ├── blacklist.js       # Gestion de la liste noire des membres
│   │   └── settings.js        # Réglages dynamiques en base (fallback .env)
│   ├── commands/
│   │   ├── index.js           # Centralisation et déploiement des Slash Commands
│   │   ├── dm.js              # /dm <membre> [mode] (ouverture de ticket & modal)
│   │   ├── close.js           # /close [raison] (clôture & transcript)
│   │   ├── mode.js            # /mode [mode] [temporaire] (bascule identité)
│   │   ├── note.js            # /note <texte> (note interne confidentielle)
│   │   ├── history.js         # /history <membre> (historique complet des tickets)
│   │   ├── blacklist.js       # /blacklist <membre> [action] [raison]
│   │   └── config.js          # /config (paramétrage à chaud salons/rôles/messages)
│   ├── events/
│   │   ├── ready.js           # Connexion, présence et déploiement des commandes
│   │   ├── interactionCreate.js # Routeur : commandes slash, boutons et modals
│   │   └── messageCreate.js   # Routeur : messages MP et messages du fil staff
│   ├── handlers/
│   │   ├── modalHandler.js    # Traitement des modals (ouverture / clôture)
│   │   ├── buttonHandler.js   # Traitement des clics boutons (mode, clôture)
│   │   ├── dmRelayHandler.js  # Relais Membre (MP) ➡️ Staff (Thread)
│   │   └── threadRelayHandler.js # Relais Staff (Thread) ➡️ Membre (MP)
│   └── utils/
│       ├── permissions.js     # Vérification des rôles et droits staff
│       ├── embeds.js          # Générateur d'embeds soignés et homogènes
│       ├── transcript.js      # Génération du transcript textuel / audit log
│       ├── rateLimiter.js     # Limitation du débit anti-spam (sliding-window)
│       └── logger.js          # Journalisation console avec horodatage
```

---

## ⚙️ Prérequis et Configuration Discord

### 1. Activer les Privileged Gateway Intents (INDISPENSABLE)

Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications) :
1. Sélectionnez votre application puis l'onglet **Bot**.
2. Dans la section **Privileged Gateway Intents**, activez obligatoirement :
   - ✅ **MESSAGE CONTENT INTENT** (pour lire le texte des messages staff et membre).
   - ✅ **SERVER MEMBERS INTENT** (pour vérifier les rôles du staff et les membres).
   - *Direct Messages* est inclus nativement dans discord.js via le partial `Channel` et les intents `DirectMessages`.

### 2. Permissions requises pour le Bot

Lors de la génération de l'URL d'invitation (OAuth2 -> URL Generator -> `bot` + `applications.commands`) :
- `View Channels`
- `Send Messages`
- `Send Messages in Threads`
- `Create Public Threads` & `Create Private Threads`
- `Manage Messages` (pour épingler et ajouter des réactions)
- `Embed Links` & `Attach Files`
- `Read Message History`
- `Add Reactions`

---

## 🚀 Installation et Lancement

### Étape 1 : Cloner ou ouvrir le projet

```bash
cd c:\dev\app\bot_mp
```

### Étape 2 : Installer les dépendances

```bash
npm install
```

### Étape 3 : Créer et remplir le fichier `.env`

Copiez `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos informations :

```env
DISCORD_TOKEN=votre_token_de_bot_ici
CLIENT_ID=votre_client_id_ici
GUILD_ID=votre_guild_id_ici
STAFF_CHANNEL_ID=id_du_salon_staff_ici
LOG_CHANNEL_ID=id_du_salon_logs_ici
STAFF_ROLE_IDS=id_role_staff_1,id_role_staff_2
DEFAULT_MODE=anonymous
```

### Étape 4 : Démarrer le bot

- **Lancement standard :**
  ```bash
  npm start
  ```
- **Mode développement avec rechargement automatique :**
  ```bash
  npm run dev
  ```

---

## 📖 Fonctionnalités et Utilisation

### 1. Ouverture d'une conversation (`/dm <membre>`)
- Réservée aux membres possédant les rôles staff configurés (ou administrateurs).
- Si l'option `mode` est renseignée (`Anonyme` ou `Nommé`), le modal s'ouvre immédiatement.
- Si l'option `mode` n'est pas renseignée, le bot affiche deux boutons éphémères : **🕵️ Anonyme** ou **👤 Nommé**, qui ouvrent le modal correspondant.
- La saisie du message initial dans le modal est obligatoire.
- Le bot tente d'envoyer le premier message en MP :
  - Si le membre a fermé ses MP : le staff est prévenu immédiatement et aucun fil orphelin n'est créé.
  - Si le MP est délivré : un fil privé `dm-<pseudo>` est créé dans le salon staff avec le panneau de contrôle et le premier message horodaté.

### 2. Gestion de l'identité (Anonyme vs Nommé)
- **Mode Anonyme :** Le membre reçoit un embed signé `L'équipe de <serveur>` avec l'icône du serveur. Le pseudo du modérateur est masqué.
- **Mode Nommé :** Le membre reçoit un embed signé `Message de <pseudo> – <serveur>` avec l'avatar du modérateur.
- **Bascule instantanée :**
  - Dans le thread, utilisez la commande `/mode [anonyme|nomme]` ou le bouton interactif **🔄 Basculer de mode**.
  - Vous pouvez utiliser `/mode mode:Nommé temporaire:Vrai` pour que seul le prochain message soit signé avec votre pseudo avant de revenir automatiquement en anonyme.
- **Audit interne préservé :** Quel que soit le mode choisi, les membres du staff voient toujours le vrai auteur dans le fil, dans la base de données et dans les transcripts.

### 3. Relais bidirectionnel
- **Membre ➡️ Staff :** Les réponses en MP du membre sont relayées instantanément dans le thread (texte, pièces jointes/images, avatar du membre). Une réaction 📨 est apposée sur le MP du membre pour confirmer la réception.
- **Staff ➡️ Membre :** Tout message posté dans le fil par un membre du staff est envoyé en MP au membre sous forme d'embed élégant :
  - Réaction ✅ si le message a été délivré avec succès.
  - Réaction ❌ et alerte dans le fil si le membre a bloqué le bot ou fermé ses MP.
- **Membre sans ticket ouvert :** S'il écrit au bot, il reçoit une réponse automatique configurable (`AUTO_REPLY_MESSAGE`). Aucun ticket n'est créé.

### 4. Notes internes (`/note <texte>` ou préfixe)
- Vous pouvez poster une note interne dans le thread de deux manières :
  1. Via `/note <texte>`
  2. En commençant votre message par `//`, `!note` ou `#` (ex: `// Ce membre a déjà reçu un avertissement`)
- La note s'affiche avec un badge violet distinctif et **n'est jamais envoyée au membre**.

### 5. Clôture (`/close [raison]` ou bouton)
- Clôture le ticket dans la base de données SQLite.
- Envoie un message de fin au membre en MP lui indiquant la fermeture de l'échange.
- Génère automatiquement un fichier de **transcript d'audit complet** (auteurs réels, horodatages, statuts de remise, pièces jointes).
- Envoie l'embed de clôture et le fichier transcript dans le salon de logs (`LOG_CHANNEL_ID`).
- Verrouille et archive le fil Discord.

### 6. Historique et Liste Noire
- `/history <membre>` : affiche la liste de tous les tickets passés et en cours avec le membre, les modérateurs ayant ouvert/fermé l'échange et les raisons.
- `/blacklist <membre> action:ajouter raison:...` : bloque le membre. Ses futurs MP seront ignorés sans créer d'alerte.

### 7. Configuration dynamique (`/config`)
- Permet aux administrateurs de consulter ou modifier à chaud les salons, les rôles staff, le mode par défaut et les textes de messages automatiques sans redémarrer le bot.

---

## 🛡️ Robustesse et Sécurité
- **Rate-Limiting :** Protection intégrée par fenêtre glissante (5 messages max / 10s) pour éviter tout flood des salons staff.
- **Gestion des erreurs :** Détection automatique des MP fermés (erreur Discord 50007), fils supprimés ou archivés, interactions expirées.
- **Base SQLite fiable :** Mode WAL activé, transactions atomiques, clés étrangères activées et arrêt gracieux (`SIGINT`/`SIGTERM`).
