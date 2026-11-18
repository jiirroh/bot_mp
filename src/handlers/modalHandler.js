/**
 * Gestionnaire des soumissions de formulaires (Modals).
 * Gère notamment l'ouverture du ticket avec le premier message et la clôture avec raison.
 */

const { ChannelType } = require('discord.js');
const conversations = require('../database/conversations');
const messages = require('../database/messages');
const blacklist = require('../database/blacklist');
const settings = require('../database/settings');
const { embeds } = require('../utils/embeds');
const { isStaff } = require('../utils/permissions');
const logger = require('../utils/logger');
const transcript = require('../utils/transcript');

async function handleModalSubmit(interaction) {
  const { customId, guild, user, client } = interaction;

  // 1. Modal d'initiation de conversation : modal_dm_<userId>_<mode>
  if (customId.startsWith('modal_dm_')) {
    const parts = customId.split('_');
    const targetUserId = parts[2];
    const chosenMode = parts[3] || 'anonymous'; // 'anonymous' ou 'named'

    // Vérification des droits staff
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Vous n\'avez pas les permissions requises pour exécuter cette action.',
        ephemeral: true
      });
    }

    const initialContent = interaction.fields.getTextInputValue('dm_initial_message');

    await interaction.deferReply({ ephemeral: true });

    // Vérification de la blacklist
    if (blacklist.isBlacklisted(targetUserId)) {
      return interaction.editReply({
        content: `⚠️ Le membre <@${targetUserId}> est dans la liste noire. Retirez-le avec \`/blacklist\` avant de lui écrire.`
      });
    }

    // Vérifier si une conversation est déjà en cours
    const existing = conversations.getActiveByUser(targetUserId);
    if (existing) {
      return interaction.editReply({
        content: `⚠️ Une conversation est déjà ouverte avec ce membre dans le fil <#${existing.thread_id}>.`
      });
    }

    // Récupérer le membre cible
    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) {
      return interaction.editReply({ content: '❌ Impossible de trouver cet utilisateur Discord.' });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Impossible d\'ouvrir une conversation avec un bot.' });
    }

    // Vérifier le salon staff configuré
    const staffChannelId = settings.get('staff_channel_id');
    const staffChannel = guild.channels.cache.get(staffChannelId) || await guild.channels.fetch(staffChannelId).catch(() => null);

    if (!staffChannel) {
      return interaction.editReply({
        content: `❌ Le salon staff (ID: \`${staffChannelId}\`) est introuvable. Configurez-le avec \`/config\`.`
      });
    }

    // Tenter d'envoyer le premier message en MP au membre
    const dmEmbed = embeds.staffToMember({
      guild,
      staffUser: user,
      content: initialContent,
      mode: chosenMode
    });

    let dmDelivered = false;
    try {
      await targetUser.send({ embeds: [dmEmbed] });
      dmDelivered = true;
    } catch (err) {
      logger.warn(`Échec de l'envoi initial de MP à ${targetUser.tag}: ${err.message}`);
      return interaction.editReply({
        content: `❌ Impossible d'envoyer le MP à **${targetUser.tag}**. Ses messages privés sont probablement fermés ou il a bloqué le bot.`
      });
    }

    // Création du fil (thread) privé dans le salon staff
    const safeName = `dm-${targetUser.username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || targetUser.id}`;
    let thread;

    try {
      // Tentative de création en fil privé
      thread = await staffChannel.threads.create({
        name: safeName,
        type: ChannelType.PrivateThread,
        reason: `Ouverture de conversation relais MP avec ${targetUser.tag} par ${user.tag}`,
        autoArchiveDuration: 1440 // 24 heures
      });
    } catch (err) {
      logger.warn(`Impossible de créer un PrivateThread (${err.message}). Tentative en PublicThread...`);
      // Fallback sur un thread public si le serveur n'autorise pas les fils privés
      thread = await staffChannel.threads.create({
        name: safeName,
        type: ChannelType.PublicThread,
        reason: `Ouverture de conversation relais MP avec ${targetUser.tag} par ${user.tag}`,
        autoArchiveDuration: 1440
      });
    }

    // Enregistrement de la conversation en base de données
    const newConv = conversations.create({
      userId: targetUser.id,
      guildId: guild.id,
      channelId: staffChannel.id,
      threadId: thread.id,
      initialMode: chosenMode,
      openedBy: user.id,
      openedByTag: user.tag || user.username
    });

    // Enregistrement du premier message en base de données
    messages.insert({
      conversationId: newConv.id,
      senderId: user.id,
      senderTag: user.tag || user.username,
      senderAvatar: user.displayAvatarURL(),
      recipientId: targetUser.id,
      content: initialContent,
      mode: chosenMode,
      direction: 'staff_to_user',
      delivered: dmDelivered ? 1 : 0
    });

    // Envoi du panneau de contrôle en tête de thread
    const headerData = embeds.threadHeader({
      member: targetUser,
      staffUser: user,
      mode: chosenMode,
      conversationId: newConv.id
    });
    const headerMsg = await thread.send(headerData);
    await headerMsg.pin().catch(() => null);

    // Envoi du premier message dans le thread avec indication visuelle
    const modeBadge = chosenMode === 'anonymous' ? '🕵️ **[Mode Anonyme]**' : '👤 **[Mode Nommé]**';
    const firstMsgInThread = await thread.send(
      `**Premier message envoyé par <@${user.id}>** (${user.tag}) — ${modeBadge} :\n>>> ${initialContent}`
    );
    await firstMsgInThread.react('✅').catch(() => null);

    // Envoi de l'audit log si un salon de log est configuré
    const logChannelId = settings.get('log_channel_id');
    if (logChannelId) {
      const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          content: `📬 **Nouvelle conversation initiée** (#${newConv.id}) :\n` +
            `• Membre : <@${targetUser.id}> (\`${targetUser.id}\`)\n` +
            `• Staff : <@${user.id}> (\`${user.tag}\`)\n` +
            `• Mode initial : **${chosenMode}**\n` +
            `• Fil staff : <#${thread.id}>`
        }).catch(e => logger.error(`Erreur d'envoi log : ${e.message}`));
      }
    }

    logger.relay(`Conversation #${newConv.id} ouverte avec ${targetUser.tag} par ${user.tag} (Mode: ${chosenMode})`);

    return interaction.editReply({
      content: `✅ La conversation avec **${targetUser.tag}** a été initiée !\n👉 Accédez au fil dédié : <#${thread.id}>`
    });
  }

  // 2. Modal de clôture de ticket : modal_close_<convId>
  if (customId.startsWith('modal_close_')) {
    const convId = customId.split('_')[2];
    const reason = interaction.fields.getTextInputValue('close_reason') || 'Aucune raison spécifiée';

    const conv = conversations.getById(convId);
    if (!conv || conv.status !== 'open') {
      return interaction.reply({
        content: '❌ Cette conversation est introuvable ou déjà fermée.',
        ephemeral: true
      });
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!isStaff(member)) {
      return interaction.reply({
        content: '❌ Vous n\'avez pas les permissions pour clôturer cette conversation.',
        ephemeral: true
      });
    }

    await interaction.deferReply();
    await performTicketClosure(conv, interaction.channel, user, reason, interaction);
  }
}

/**
 * Logique mutualisée de clôture d'une conversation (utilisée par /close et par le bouton/modal).
 */
async function performTicketClosure(conv, threadChannel, staffUser, reason, interactionOrMessage) {
  const client = threadChannel.client;
  const guild = threadChannel.guild;

  // 1. Clôture en base de données
  conversations.close(conv.thread_id, {
    closedBy: staffUser.id,
    closedByTag: staffUser.tag || staffUser.username,
    reason
  });

  // 2. Notification au membre en MP
  const targetUser = await client.users.fetch(conv.user_id).catch(() => null);
  if (targetUser) {
    const closeNotice = embeds.ticketClosed({
      guild,
      closeMessage: settings.get('close_message'),
      reason
    });
    await targetUser.send({ embeds: [closeNotice] }).catch(err => {
      logger.warn(`Impossible de notifier le membre de la clôture : ${err.message}`);
    });
  }

  // 3. Récupération de l'historique et génération du transcript
  const messageList = messages.getByConversation(conv.id);
  const transcriptAttachment = transcript.generateFile(
    { ...conv, closed_at: Date.now(), closed_by: staffUser.id, closed_by_tag: staffUser.tag, close_reason: reason },
    messageList,
    targetUser
  );

  // 4. Envoi du log dans le salon dédié
  const logChannelId = settings.get('log_channel_id');
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = embeds.transcriptLog({
        conversation: conv,
        memberUser: targetUser,
        closedByUser: staffUser,
        messageCount: messageList.length,
        reason
      });

      await logChannel.send({
        embeds: [logEmbed],
        files: [transcriptAttachment]
      }).catch(err => logger.error(`Erreur d'envoi du transcript dans le salon log : ${err.message}`));
    }
  }

  // 5. Message final dans le thread, verrouillage et archivage
  const finalNotice = `🔒 **Ticket clôturé par <@${staffUser.id}>** (${staffUser.tag}).\n` +
    `• Raison : *${reason}*\n` +
    `• Le membre a été informé.\n` +
    `• Ce fil est désormais verrouillé et archivé.`;

  if (interactionOrMessage && typeof interactionOrMessage.editReply === 'function') {
    await interactionOrMessage.editReply({ content: finalNotice });
  } else {
    await threadChannel.send({ content: finalNotice });
  }

  try {
    await threadChannel.setLocked(true, `Clôturé par ${staffUser.tag}`);
    await threadChannel.setArchived(true, `Clôturé par ${staffUser.tag}`);
  } catch (err) {
    logger.warn(`Impossible de verrouiller/archiver le thread : ${err.message}`);
  }

  logger.relay(`Conversation #${conv.id} clôturée avec succès par ${staffUser.tag}`);
}

module.exports = { handleModalSubmit, performTicketClosure };
