/**
 * Relais des messages envoyés par les membres en MP vers le thread du staff.
 */

const { AttachmentBuilder } = require('discord.js');
const conversations = require('../database/conversations');
const messages = require('../database/messages');
const blacklist = require('../database/blacklist');
const settings = require('../database/settings');
const { embeds } = require('../utils/embeds');
const rateLimiter = require('../utils/rateLimiter');
const logger = require('../utils/logger');

async function handleDmMessage(message, client) {
  // Ignorer les messages de bots
  if (message.author.bot) return;

  const userId = message.author.id;

  // 1. Vérification du rate-limit anti-spam
  if (!rateLimiter.check(userId)) {
    return message.reply({
      content: '⚠️ Vous envoyez des messages trop rapidement. Merci de patienter quelques secondes.'
    }).catch(() => null);
  }

  // 2. Vérification de la liste noire
  if (blacklist.isBlacklisted(userId)) {
    // Si blacklisté, ignorer silencieusement pour éviter le spam
    return;
  }

  // 3. Recherche d'une conversation active
  const conv = conversations.getActiveByUser(userId);

  // Cas : Aucune conversation ouverte
  if (!conv) {
    const autoReplyText = settings.get('auto_reply_message');
    const autoReplyEmbed = embeds.autoReply({
      guild: null,
      messageText: autoReplyText
    });

    return message.channel.send({ embeds: [autoReplyEmbed] }).catch(err => {
      logger.warn(`Impossible d'envoyer la réponse automatique en MP à ${message.author.tag}: ${err.message}`);
    });
  }

  // Cas : Conversation active trouvée -> Relais vers le fil staff
  try {
    const thread = await client.channels.fetch(conv.thread_id).catch(() => null);

    if (!thread) {
      logger.error(`Fil staff #${conv.thread_id} introuvable pour la conversation #${conv.id}.`);
      // Ferme automatiquement la conversation orpheline
      conversations.close(conv.thread_id, {
        closedBy: 'SYSTEM',
        closedByTag: 'Système',
        reason: 'Fil de discussion Discord introuvable ou supprimé'
      });
      return message.channel.send({
        content: '⚠️ Le salon de discussion avec l\'équipe n\'est plus accessible. Votre conversation a été close.'
      }).catch(() => null);
    }

    // Si le fil était archivé par inactivité, le réactiver
    if (thread.archived) {
      await thread.setArchived(false, 'Réouverture automatique suite à une réponse du membre');
    }

    // Préparation des pièces jointes
    const attachmentsData = [];
    const filesToSend = [];

    if (message.attachments.size > 0) {
      for (const [, att] of message.attachments) {
        attachmentsData.push({
          name: att.name,
          url: att.url,
          contentType: att.contentType,
          size: att.size
        });
        // On transfère directement la pièce jointe dans le fil
        filesToSend.push(att.url);
      }
    }

    // Construction de l'embed relayé au staff
    const relayEmbed = embeds.memberToThread({
      user: message.author,
      content: message.content
    });

    // Envoi dans le fil staff
    const staffMessage = await thread.send({
      embeds: [relayEmbed],
      files: filesToSend
    });

    // Confirmation visuelle pour le membre dans ses MP
    await message.react('📨').catch(() => null);

    // Enregistrement du message dans la base de données
    messages.insert({
      conversationId: conv.id,
      discordMessageId: staffMessage.id,
      senderId: message.author.id,
      senderTag: message.author.tag || message.author.username,
      senderAvatar: message.author.displayAvatarURL(),
      recipientId: 'STAFF',
      content: message.content,
      attachments: attachmentsData,
      mode: 'member',
      direction: 'user_to_staff',
      delivered: 1
    });

    logger.relay(`Message reçu de ${message.author.tag} et relayé dans le fil #${thread.id}`);
  } catch (err) {
    logger.error(`Erreur lors du relais du message MP vers le fil staff : ${err.message}`);
  }
}

module.exports = { handleDmMessage };
