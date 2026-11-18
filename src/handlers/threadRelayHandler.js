/**
 * Relais des messages envoyés par le staff dans le thread vers les MP du membre.
 */

const conversations = require('../database/conversations');
const messages = require('../database/messages');
const { embeds } = require('../utils/embeds');
const { isStaff } = require('../utils/permissions');
const logger = require('../utils/logger');

async function handleThreadMessage(message, client) {
  // Ignorer les messages de bots
  if (message.author.bot) return;

  // Vérifier si le message est posté dans un fil (thread)
  if (!message.channel.isThread()) return;

  // Vérifier si le fil correspond à une conversation active
  const conv = conversations.getByThread(message.channel.id);
  if (!conv || conv.status !== 'open') return;

  // Vérifier que l'auteur est bien un membre du staff
  const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!isStaff(member)) return;

  // Gestion des notes internes rédigées avec un préfixe (ex. "//", "!note", "#")
  const trimmed = message.content.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('!note') || trimmed.startsWith('#')) {
    const noteText = trimmed.replace(/^(\/\/|!note|#)\s*/, '');

    await message.react('📝').catch(() => null);

    messages.insert({
      conversationId: conv.id,
      discordMessageId: message.id,
      senderId: message.author.id,
      senderTag: message.author.tag || message.author.username,
      senderAvatar: message.author.displayAvatarURL(),
      recipientId: conv.user_id,
      content: noteText,
      mode: 'internal_note',
      direction: 'internal_note',
      delivered: 1
    });

    logger.debug(`Note interne enregistrée dans le fil #${conv.thread_id} par ${message.author.tag}`);
    return;
  }

  // Détermination du mode d'envoi pour ce message
  // Si une surcharge ponctuelle a été demandée via /mode pour ce message précis, on l'utilise
  let activeMode = conv.current_mode;
  if (conv.next_mode_override) {
    activeMode = conv.next_mode_override;
    // Réinitialise la surcharge après utilisation
    conversations.clearNextModeOverride(conv.thread_id);
  }

  // Récupération de l'utilisateur cible
  const targetUser = await client.users.fetch(conv.user_id).catch(() => null);
  if (!targetUser) {
    await message.react('❌').catch(() => null);
    return message.channel.send({
      content: '❌ **Erreur :** Le membre destinataire est introuvable sur Discord.'
    });
  }

  // Préparation de l'embed pour le membre selon le mode (Anonyme ou Nommé)
  const dmEmbed = embeds.staffToMember({
    guild: message.guild,
    staffUser: message.author,
    content: message.content,
    mode: activeMode
  });

  // Préparation des pièces jointes à transmettre
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
      filesToSend.push(att.url);
    }
  }

  // Tentative d'envoi en MP au membre
  let delivered = false;
  try {
    await targetUser.send({
      embeds: [dmEmbed],
      files: filesToSend
    });
    delivered = true;

    // Réaction de succès sur le message du staff dans le thread
    await message.react('✅').catch(() => null);

    logger.relay(`Message du staff (${message.author.tag}, Mode: ${activeMode}) livré à ${targetUser.tag}`);
  } catch (err) {
    logger.warn(`Échec de remise en MP à ${targetUser.tag}: ${err.message}`);

    // Réaction d'erreur sur le message du staff
    await message.react('❌').catch(() => null);

    // Notification explicite au staff dans le fil
    await message.channel.send({
      content: `⚠️ **Échec de livraison en MP :** Le message n'a pas pu être remis à <@${targetUser.id}>.\n` +
        `Raison probable : messages privés fermés, bot bloqué ou serveur quitté.`
    });
  }

  // Enregistrement du message dans la base de données (auteur réel toujours tracé)
  messages.insert({
    conversationId: conv.id,
    discordMessageId: message.id,
    senderId: message.author.id,
    senderTag: message.author.tag || message.author.username,
    senderAvatar: message.author.displayAvatarURL(),
    recipientId: conv.user_id,
    content: message.content,
    attachments: attachmentsData,
    mode: activeMode,
    direction: 'staff_to_user',
    delivered: delivered ? 1 : 0
  });
}

module.exports = { handleThreadMessage };
