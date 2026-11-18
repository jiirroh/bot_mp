/**
 * Commande Slash /close : Clôture une conversation active dans son fil staff.
 */

const { SlashCommandBuilder } = require('discord.js');
const conversations = require('../database/conversations');
const { isStaff } = require('../utils/permissions');
const { performTicketClosure } = require('../handlers/modalHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Clôture la conversation relais du fil actuel')
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('Raison de la fermeture du ticket')
        .setRequired(false)
        .setMaxLength(250)
    ),

  async execute(interaction) {
    if (!interaction.channel.isThread()) {
      return interaction.reply({
        content: '❌ Cette commande doit être exécutée dans le fil de discussion d\'un ticket.',
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

    const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

    await interaction.deferReply();
    await performTicketClosure(conv, interaction.channel, interaction.user, reason, interaction);
  }
};
