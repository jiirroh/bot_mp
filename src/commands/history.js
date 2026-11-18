/**
 * Commande Slash /history : Affiche l'historique des conversations passées d'un membre.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const conversations = require('../database/conversations');
const { isStaff } = require('../utils/permissions');
const { COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Consulte l\'historique des conversations passées et actives d\'un membre')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre dont vous souhaitez voir l\'historique')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Action réservée aux membres du staff.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('membre');
    const history = conversations.getUserHistory(targetUser.id);

    if (history.length === 0) {
      return interaction.reply({
        content: `ℹ️ Aucune conversation enregistrée pour **${targetUser.tag}** (\`${targetUser.id}\`).`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`📜 Historique des tickets — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `Total de conversations : **${history.length}**\nMembre : <@${targetUser.id}> (\`${targetUser.id}\`)`
      )
      .setTimestamp();

    // Affichage des 10 dernières conversations
    const displayList = history.slice(0, 10);

    for (const conv of displayList) {
      const openDate = new Date(conv.created_at).toLocaleDateString('fr-FR');
      const statusIcon = conv.status === 'open' ? '🟢 En cours' : '🔴 Fermé';

      let details = `• Statut : **${statusIcon}**\n` +
        `• Initié par : <@${conv.opened_by}> (\`${conv.opened_by_tag}\`)\n` +
        `• Messages échangés : **${conv.total_messages}**\n` +
        `• Date : ${openDate}`;

      if (conv.status === 'closed') {
        details += `\n• Fermé par : <@${conv.closed_by}> (\`${conv.closed_by_tag || 'N/A'}\`)` +
          `\n• Raison : *${conv.close_reason || 'Aucune'}*`;
      } else {
        details += `\n• Fil actuel : <#${conv.thread_id}>`;
      }

      embed.addFields({
        name: `Ticket #${conv.id} — ${conv.current_mode === 'anonymous' ? '🕵️ Anonyme' : '👤 Nommé'}`,
        value: details,
        inline: false
      });
    }

    if (history.length > 10) {
      embed.setFooter({ text: `Affichage des 10 conversations les plus récentes sur un total de ${history.length}.` });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
