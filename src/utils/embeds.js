/**
 * Fabrique d'embeds Discord homogènes et soignés pour le bot de relais MP.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COLORS = {
  PRIMARY: 0x5865F2,   // Blurple Discord
  SUCCESS: 0x2ECC71,   // Vert
  WARNING: 0xF1C40F,   // Jaune
  DANGER: 0xE74C3C,    // Rouge
  INFO: 0x3498DB,      // Bleu clair
  NOTE: 0x9B59B6,      // Violet (notes internes)
  DARK: 0x2F3136       // Gris foncé
};

const embeds = {
  /**
   * Embed envoyé au membre dans ses MP par le staff.
   */
  staffToMember({ guild, staffUser, content, mode }) {
    const isAnon = mode === 'anonymous';

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription(content || '*[Aucun contenu textuel]*')
      .setTimestamp();

    if (isAnon) {
      embed.setAuthor({
        name: `L'équipe de ${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      });
      embed.setFooter({
        text: `${guild.name} • Mode Anonyme • Répondez pour échanger avec l'équipe`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      });
    } else {
      embed.setAuthor({
        name: `Message de ${staffUser.displayName || staffUser.username} – ${guild.name}`,
        iconURL: staffUser.displayAvatarURL({ dynamic: true })
      });
      embed.setFooter({
        text: `${guild.name} • Message Nommé • Répondez pour échanger avec l'équipe`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      });
    }

    return embed;
  },

  /**
   * Embed posté dans le thread staff lorsqu'un membre répond en MP.
   */
  memberToThread({ user, content }) {
    return new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setAuthor({
        name: `${user.tag || user.username} (${user.id})`,
        iconURL: user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(content || '*[Message sans contenu textuel / pièces jointes]*')
      .setTimestamp()
      .setFooter({
        text: 'Réponse reçue en MP',
        iconURL: user.displayAvatarURL({ dynamic: true })
      });
  },

  /**
   * Panneau de contrôle initial affiché en tête du fil staff.
   */
  threadHeader({ member, staffUser, mode, conversationId }) {
    const isAnon = mode === 'anonymous';

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`📬 Conversation Relais MP #${conversationId}`)
      .setDescription(
        `Conversation ouverte avec <@${member.id}> (${member.user?.tag || member.tag || member.id}).\n\n` +
        `**Fonctionnement du relais :**\n` +
        `• Écrivez un message ici pour l'envoyer directement en MP au membre.\n` +
        `• Une réaction ✅ confirme la remise, ❌ signale un échec (MP fermés).\n` +
        `• Utilisez \`/note <texte>\` pour écrire une note interne jamais envoyée au membre.\n` +
        `• Utilisez \`/mode\` ou le bouton ci-dessous pour changer le mode d'envoi.`
      )
      .addFields(
        {
          name: '👤 Membre',
          value: `<@${member.id}>\n\`${member.user?.tag || member.tag || member.id}\`\nID : \`${member.id}\``,
          inline: true
        },
        {
          name: '🛡️ Initié par',
          value: `<@${staffUser.id}>\n\`${staffUser.tag || staffUser.username}\``,
          inline: true
        },
        {
          name: '🎭 Mode actif',
          value: isAnon ? '🕵️ **Anonyme** (L\'équipe)' : '👤 **Nommé** (Pseudo visible)',
          inline: true
        }
      )
      .setThumbnail((member.user || member).displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    // Boutons de contrôle rapides
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_toggle_mode_${conversationId}`)
        .setLabel(isAnon ? 'Passer en mode Nommé' : 'Passer en mode Anonyme')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),

      new ButtonBuilder()
        .setCustomId(`btn_close_${conversationId}`)
        .setLabel('Clôturer le ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    return { embeds: [embed], components: [row] };
  },

  /**
   * Embed pour une note interne dans le fil staff.
   */
  internalNote({ staffUser, content }) {
    return new EmbedBuilder()
      .setColor(COLORS.NOTE)
      .setAuthor({
        name: `📝 Note interne — ${staffUser.tag || staffUser.username}`,
        iconURL: staffUser.displayAvatarURL({ dynamic: true })
      })
      .setDescription(content)
      .setFooter({ text: 'Visible uniquement par le staff — Jamais transmis au membre' })
      .setTimestamp();
  },

  /**
   * Message automatique envoyé à un membre qui contacte le bot sans ticket ouvert.
   */
  autoReply({ guild, messageText }) {
    return new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setAuthor({
        name: guild ? guild.name : 'Information',
        iconURL: guild ? guild.iconURL({ dynamic: true }) : undefined
      })
      .setTitle('ℹ️ Message non transmis')
      .setDescription(messageText)
      .setTimestamp();
  },

  /**
   * Notification envoyée au membre à la clôture du ticket.
   */
  ticketClosed({ guild, closeMessage, reason }) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.DARK)
      .setAuthor({
        name: `L'équipe de ${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      })
      .setTitle('🔒 Ticket fermé')
      .setDescription(closeMessage)
      .setTimestamp();

    if (reason) {
      embed.addFields({ name: 'Raison indiquée', value: reason });
    }

    return embed;
  },

  /**
   * Embed envoyé dans le salon de logs à la clôture d'un ticket.
   */
  transcriptLog({ conversation, memberUser, closedByUser, messageCount, reason }) {
    const durationMs = (conversation.closed_at || Date.now()) - conversation.created_at;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`📑 Clôture de conversation #${conversation.id}`)
      .setDescription(`La conversation avec **${memberUser ? memberUser.tag : conversation.user_id}** a été clôturée.`)
      .addFields(
        {
          name: '👤 Membre',
          value: memberUser ? `<@${memberUser.id}> (\`${memberUser.id}\`)` : `\`${conversation.user_id}\``,
          inline: true
        },
        {
          name: '🛡️ Ouvert par',
          value: `<@${conversation.opened_by}> (\`${conversation.opened_by_tag}\`)`,
          inline: true
        },
        {
          name: '🔒 Fermé par',
          value: closedByUser ? `<@${closedByUser.id}> (\`${closedByUser.tag || closedByUser.username}\`)` : `\`${conversation.closed_by_tag || 'Système'}\``,
          inline: true
        },
        {
          name: '💬 Total messages',
          value: `${messageCount}`,
          inline: true
        },
        {
          name: '⏱️ Durée',
          value: `${durationMinutes} minute(s)`,
          inline: true
        },
        {
          name: '📝 Raison',
          value: reason || 'Aucune raison spécifiée',
          inline: true
        }
      )
      .setTimestamp();
  }
};

module.exports = { embeds, COLORS };
