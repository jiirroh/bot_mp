/**
 * Événement 'messageCreate' : oriente les messages reçus en MP vers le relais membre,
 * et les messages postés dans les fils staff vers le relais staff.
 */

const { handleDmMessage } = require('../handlers/dmRelayHandler');
const { handleThreadMessage } = require('../handlers/threadRelayHandler');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    // Ignorer les messages de bots
    if (message.author.bot) return;

    try {
      // 1. Message privé envoyé directement au bot par un membre
      if (message.channel.isDMBased()) {
        await handleDmMessage(message, client);
        return;
      }

      // 2. Message posté dans un fil (thread) de discussion du serveur
      if (message.channel.isThread()) {
        await handleThreadMessage(message, client);
        return;
      }
    } catch (error) {
      logger.error(`Erreur dans messageCreate : ${error.message}`);
      if (error.stack) logger.debug(error.stack);
    }
  }
};
