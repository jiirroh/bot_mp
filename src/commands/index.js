/**
 * Centralisation et enregistrement des commandes Slash Discord.
 */

const { Collection, REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

// Importation de toutes les commandes
const dm = require('./dm');
const close = require('./close');
const mode = require('./mode');
const note = require('./note');
const history = require('./history');
const blacklist = require('./blacklist');
const configCommand = require('./config');

const commandList = [dm, close, mode, note, history, blacklist, configCommand];

const commands = new Collection();
for (const cmd of commandList) {
  if (cmd.data && cmd.data.name) {
    commands.set(cmd.data.name, cmd);
  }
}

/**
 * Enregistre les commandes Slash auprès de l'API Discord.
 * @param {string} token
 * @param {string} clientId
 * @param {string} [guildId] Si spécifié, déploie instantanément sur ce serveur
 */
async function registerSlashCommands(token, clientId, guildId = null) {
  if (!token || !clientId) {
    logger.warn('Token ou Client ID absent, enregistrement des commandes ignoré.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const payload = commandList.map(c => c.data.toJSON());

  try {
    logger.info(`Déploiement de ${payload.length} commande(s) Slash...`);

    if (guildId) {
      // Déploiement instantané sur le serveur configuré
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: payload }
      );
      logger.success(`Commandes Slash déployées avec succès sur le serveur (${guildId}).`);
    } else {
      // Déploiement global (peut prendre jusqu'à 1 heure pour se propager partout)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: payload }
      );
      logger.success('Commandes Slash déployées globalement.');
    }
  } catch (error) {
    logger.error(`Erreur lors du déploiement des commandes Slash : ${error.message}`);
  }
}

module.exports = { commands, registerSlashCommands };
