/**
 * Événement 'interactionCreate' : aiguille les commandes slash, boutons et modals.
 */

const { commands } = require('../commands');
const { handleModalSubmit } = require('../handlers/modalHandler');
const { handleButtonClick } = require('../handlers/buttonHandler');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    try {
      // 1. Commandes Slash
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          logger.warn(`Commande Slash inconnue : ${interaction.commandName}`);
          return;
        }

        await command.execute(interaction);
        return;
      }

      // 2. Boutons
      if (interaction.isButton()) {
        await handleButtonClick(interaction);
        return;
      }

      // 3. Soumissions de Modals
      if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
        return;
      }
    } catch (error) {
      logger.error(`Erreur lors du traitement de l'interaction (${interaction.type}) : ${error.message}`);
      if (error.stack) logger.debug(error.stack);

      const errorMessage = {
        content: '❌ Une erreur est survenue lors de l\'exécution de cette action.',
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorMessage).catch(() => null);
      } else {
        await interaction.reply(errorMessage).catch(() => null);
      }
    }
  }
};
