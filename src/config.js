/**
 * Module de configuration de l'application.
 * Charge les variables d'environnement depuis le fichier .env
 * et définit des valeurs par défaut sécurisées.
 */

require('dotenv').config();
const path = require('path');
const logger = require('./utils/logger');

const config = {
  // Informations de connexion Discord
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',

  // Salons clés
  staffChannelId: process.env.STAFF_CHANNEL_ID || '',
  logChannelId: process.env.LOG_CHANNEL_ID || '',

  // Liste des IDs de rôles staff ayant accès aux commandes
  staffRoleIds: (process.env.STAFF_ROLE_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),

  // Mode par défaut pour l'identité ('anonymous' ou 'named')
  defaultMode: (process.env.DEFAULT_MODE || 'anonymous').toLowerCase() === 'named' ? 'named' : 'anonymous',

  // Messages configurables
  autoReplyMessage: process.env.AUTO_REPLY_MESSAGE ||
    "Bonjour. Ce bot est exclusivement réservé aux messages initiés par l'équipe du serveur. Vous ne pouvez pas ouvrir de ticket par vous-même ici. Pour toute demande, merci de contacter le staff sur le serveur.",

  closeMessage: process.env.CLOSE_MESSAGE ||
    "Cette conversation a été clôturée par l'équipe. Vos nouveaux messages ne seront plus transmis. Merci pour votre échange.",

  // Emplacement de la base SQLite
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'modmail.db'),

  // Validation minimale au démarrage
  validate() {
    const missing = [];
    if (!this.token) missing.push('DISCORD_TOKEN');
    if (!this.clientId) missing.push('CLIENT_ID');
    if (!this.staffChannelId) missing.push('STAFF_CHANNEL_ID');

    if (missing.length > 0) {
      logger.warn(`Variables d'environnement manquantes dans le .env : ${missing.join(', ')}`);
      logger.warn('Le bot risque de ne pas fonctionner correctement sans ces valeurs.');
    }
  }
};

module.exports = config;
