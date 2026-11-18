/**
 * Point d'entrée principal du bot Discord "Relais de MP".
 * Initialise le client Discord avec les intents et partials requis,
 * charge les écouteurs d'événements et gère l'arrêt propre de l'application.
 */

const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const config = require('./config');
const db = require('./database/db');
const logger = require('./utils/logger');

// Validation initiale des variables d'environnement
config.validate();

// Instanciation du client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Channel,  // INDISPENSABLE pour recevoir les messages privés (DMs)
    Partials.Message,  // Permet de traiter les messages même non mis en cache
    Partials.User,     // Permet d'obtenir les infos des utilisateurs en MP
    Partials.Reaction  // Pour gérer les réactions sur les messages
  ]
});

// Chargement des écouteurs d'événements
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');
const messageCreateEvent = require('./events/messageCreate');

client.once(readyEvent.name, (...args) => readyEvent.execute(...args, client));
client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args, client));
client.on(messageCreateEvent.name, (...args) => messageCreateEvent.execute(...args, client));

// Gestion globale des exceptions pour éviter les crashs inopinés
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejet de promesse non intercepté (unhandledRejection) :', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Exception non interceptée (uncaughtException) :', err);
});

// Arrêt propre du bot lors des signaux de terminaison (SIGINT / SIGTERM)
function gracefulShutdown(signal) {
  logger.info(`Signal ${signal} reçu. Fermeture propre du bot...`);
  try {
    client.destroy();
    db.close();
    logger.success('Base de données et connexion Discord fermées avec succès.');
  } catch (err) {
    logger.error('Erreur lors de la fermeture :', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Connexion du bot à Discord
if (config.token) {
  logger.info('Connexion à la passerelle Discord en cours...');
  client.login(config.token).catch(err => {
    logger.error(`Échec de connexion à Discord : ${err.message}`);
    logger.error('Vérifiez que le token dans votre fichier .env est valide.');
  });
} else {
  logger.warn('Aucun jeton DISCORD_TOKEN spécifié dans le fichier .env.');
  logger.warn('Remplissez le fichier .env (en copiant .env.example) avant de lancer le bot.');
}
