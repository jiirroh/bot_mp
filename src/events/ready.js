/**
 * Événement 'ready' : déclenché lorsque le bot est connecté et prêt.
 */

const { ActivityType } = require('discord.js');
const { registerSlashCommands } = require('../commands');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.success(`Connecté en tant que ${client.user.tag} (ID: ${client.user.id})`);
    logger.info(`Actif sur ${client.guilds.cache.size} serveur(s).`);

    // Définition du statut du bot
    client.user.setPresence({
      activities: [{ name: 'Relais de MP | /dm', type: ActivityType.Custom }],
      status: 'online'
    });

    // Enregistrement des commandes Slash
    await registerSlashCommands(config.token, config.clientId, config.guildId);
  }
};
