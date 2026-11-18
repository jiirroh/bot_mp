/**
 * Gestionnaire des clics sur les boutons interactifs.
 */

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const conversations = require('../database/conversations');
const { isStaff } = require('../utils/permissions');

async function handleButtonClick(interaction) {
  const { customId, user, guild } = interaction;

  // 1. Bouton d'initiation du modal DM : btn_dm_init_<userId>_<mode>
  if (customId.startsWith('btn_dm_init_')) {
    const parts = customId.split('_');
    const targetUserId = parts[3];
    const mode = parts[4]; // 'anonymous' ou 'named'

    const modeLabel = mode === 'anonymous' ? 'Anonyme' : 'Nommé';

    const modal = new ModalBuilder()
      .setCustomId(`modal_dm_${targetUserId}_${mode}`)
      .setTitle(`Nouveau message (${modeLabel})`);

    const messageInput = new TextInputBuilder()
      .setCustomId('dm_initial_message')
      .setLabel('Premier message à envoyer au membre')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Rédigez ici le message que le bot transmettra en MP au membre...')
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    return interaction.showModal(modal);
  }

  // 2. Bouton de bascule de mode : btn_toggle_mode_<convId>
  if (customId.startsWith('btn_toggle_mode_')) {
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Action réservée aux membres du staff.',
        ephemeral: true
      });
    }

    const convId = customId.split('_')[3];
    const conv = conversations.getById(convId);

    if (!conv || conv.status !== 'open') {
      return interaction.reply({
        content: '❌ Cette conversation est introuvable ou fermée.',
        ephemeral: true
      });
    }

    const newMode = conv.current_mode === 'anonymous' ? 'named' : 'anonymous';
    conversations.updateMode(conv.thread_id, newMode);

    const modeText = newMode === 'anonymous'
      ? '🕵️ **Anonyme** (Le membre verra seulement "L\'équipe de ' + guild.name + '")'
      : '👤 **Nommé** (Le membre verra votre pseudo : "Message de ' + (user.displayName || user.username) + '")';

    return interaction.reply({
      content: `🔄 Mode d'identité basculé avec succès !\nLes prochains messages du fil seront envoyés en mode : ${modeText}.`,
      ephemeral: false
    });
  }

  // 3. Bouton de clôture de ticket : btn_close_<convId>
  if (customId.startsWith('btn_close_')) {
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Action réservée aux membres du staff.',
        ephemeral: true
      });
    }

    const convId = customId.split('_')[2];
    const conv = conversations.getById(convId);

    if (!conv || conv.status !== 'open') {
      return interaction.reply({
        content: '❌ Cette conversation est introuvable ou déjà fermée.',
        ephemeral: true
      });
    }

    // Affiche un modal pour demander la raison de la clôture
    const modal = new ModalBuilder()
      .setCustomId(`modal_close_${convId}`)
      .setTitle('Clôture de la conversation');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Raison de la clôture (optionnel)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex : Problème résolu, fin de l\'échange...')
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

    return interaction.showModal(modal);
  }
}

module.exports = { handleButtonClick };
