/**
 * Commande Slash /mode : Change ou bascule le mode d'identité du staff dans le thread actif.
 */

const { SlashCommandBuilder } = require('discord.js');
const conversations = require('../database/conversations');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mode')
    .setDescription('Modifie ou bascule le mode d\'identité (Anonyme / Nommé) pour ce ticket')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Le nouveau mode à appliquer')
        .setRequired(false)
        .addChoices(
          { name: '🕵️ Anonyme (L\'équipe)', value: 'anonymous' },
          { name: '👤 Nommé (Pseudo visible)', value: 'named' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('temporaire')
        .setDescription('Appliquer ce mode uniquement pour le TOUT PROCHAIN message ?')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.channel.isThread()) {
      return interaction.reply({
        content: '❌ Cette commande doit être exécutée à l\'intérieur d\'un fil de ticket.',
        ephemeral: true
      });
    }

    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Action réservée aux membres du staff.',
        ephemeral: true
      });
    }

    const conv = conversations.getByThread(interaction.channel.id);
    if (!conv || conv.status !== 'open') {
      return interaction.reply({
        content: '❌ Aucune conversation active n\'est liée à ce fil.',
        ephemeral: true
      });
    }

    const inputMode = interaction.options.getString('mode');
    const isTemporary = interaction.options.getBoolean('temporaire') || false;

    // Si aucun mode n'est passé en paramètre, on inverse le mode actuel
    let targetMode = inputMode;
    if (!targetMode) {
      targetMode = conv.current_mode === 'anonymous' ? 'named' : 'anonymous';
    }

    if (isTemporary) {
      conversations.setNextModeOverride(conv.thread_id, targetMode);
      const label = targetMode === 'anonymous' ? '🕵️ **Anonyme**' : '👤 **Nommé**';
      return interaction.reply({
        content: `⏱️ Le **prochain message** que vous enverrez dans ce fil sera transmis en mode ${label}. Il reviendra ensuite au mode par défaut de la conversation (${conv.current_mode === 'anonymous' ? 'Anonyme' : 'Nommé'}).`
      });
    } else {
      conversations.updateMode(conv.thread_id, targetMode);
      const label = targetMode === 'anonymous' ? '🕵️ **Anonyme** (L\'équipe)' : '👤 **Nommé** (Pseudo visible)';
      return interaction.reply({
        content: `🔄 Le mode de la conversation est désormais configuré sur : ${label}.`
      });
    }
  }
};
