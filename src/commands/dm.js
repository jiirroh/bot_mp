/**
 * Commande Slash /dm : Initie une conversation relais avec un membre.
 */

const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const conversations = require('../database/conversations');
const blacklist = require('../database/blacklist');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Initie une conversation relais en MP avec un membre du serveur')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre à contacter par MP')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Mode d\'identité pour cette conversation')
        .setRequired(false)
        .addChoices(
          { name: '🕵️ Anonyme (L\'équipe de <serveur>)', value: 'anonymous' },
          { name: '👤 Nommé (Votre pseudo sera visible)', value: 'named' }
        )
    ),

  async execute(interaction) {
    // 1. Vérification des permissions staff
    const member = interaction.member;
    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux membres du staff.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('membre');
    const chosenMode = interaction.options.getString('mode');

    // 2. Vérifications de validité de la cible
    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ Vous ne pouvez pas ouvrir de conversation relais avec un bot.',
        ephemeral: true
      });
    }

    if (blacklist.isBlacklisted(targetUser.id)) {
      return interaction.reply({
        content: `⚠️ Le membre <@${targetUser.id}> est sur liste noire. Retirez-le avec \`/blacklist retirer\` pour pouvoir le contacter.`,
        ephemeral: true
      });
    }

    // 3. Vérifier si une conversation est déjà en cours
    const existing = conversations.getActiveByUser(targetUser.id);
    if (existing) {
      return interaction.reply({
        content: `⚠️ Une conversation est déjà ouverte avec <@${targetUser.id}> dans le fil <#${existing.thread_id}>.`,
        ephemeral: true
      });
    }

    // 4. Si le mode a été spécifié dans la commande, on ouvre directement le modal
    if (chosenMode) {
      const modeLabel = chosenMode === 'anonymous' ? 'Anonyme' : 'Nommé';

      const modal = new ModalBuilder()
        .setCustomId(`modal_dm_${targetUser.id}_${chosenMode}`)
        .setTitle(`Premier message (${modeLabel})`);

      const messageInput = new TextInputBuilder()
        .setCustomId('dm_initial_message')
        .setLabel('Premier message envoyé au membre')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Rédigez ici le premier message à transmettre en MP...')
        .setRequired(true)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
      return interaction.showModal(modal);
    }

    // 5. Si aucun mode n'a été spécifié, proposer le choix obligatoire via deux boutons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_dm_init_${targetUser.id}_anonymous`)
        .setLabel('Anonyme (L\'équipe)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🕵️'),

      new ButtonBuilder()
        .setCustomId(`btn_dm_init_${targetUser.id}_named`)
        .setLabel('Nommé (Pseudo visible)')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👤')
    );

    return interaction.reply({
      content: `Sélectionnez le mode d'identité obligatoire pour contacter **${targetUser.tag}** :`,
      components: [row],
      ephemeral: true
    });
  }
};
