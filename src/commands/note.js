/**
 * Commande Slash /note : Insère une note interne dans le fil staff, jamais transmise au membre.
 */

const { SlashCommandBuilder } = require('discord.js');
const conversations = require('../database/conversations');
const messages = require('../database/messages');
const { embeds } = require('../utils/embeds');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Ajoute une note interne visible uniquement par le staff (jamais transmise au membre)')
    .addStringOption(option =>
      option
        .setName('texte')
        .setDescription('Contenu de la note interne')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  async execute(interaction) {
    if (!interaction.channel.isThread()) {
      return interaction.reply({
        content: '❌ Cette commande doit être exécutée dans le fil d\'une conversation relais.',
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

    const noteText = interaction.options.getString('texte');

    // Construction de l'embed de note interne
    const noteEmbed = embeds.internalNote({
      staffUser: interaction.user,
      content: noteText
    });

    // Envoi dans le fil
    await interaction.reply({ embeds: [noteEmbed] });

    // Enregistrement en base de données
    messages.insert({
      conversationId: conv.id,
      senderId: interaction.user.id,
      senderTag: interaction.user.tag || interaction.user.username,
      senderAvatar: interaction.user.displayAvatarURL(),
      recipientId: conv.user_id,
      content: noteText,
      mode: 'internal_note',
      direction: 'internal_note',
      delivered: 1
    });
  }
};
