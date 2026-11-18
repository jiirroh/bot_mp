/**
 * Commande Slash /blacklist : Gère la liste noire des membres bloqués.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blacklist = require('../database/blacklist');
const { isStaff } = require('../utils/permissions');
const { COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Gère la liste noire des membres interdits d\'échanges avec le bot')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre ciblé')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Action à effectuer')
        .setRequired(true)
        .addChoices(
          { name: '🔍 Vérifier le statut', value: 'check' },
          { name: '➕ Ajouter à la blacklist', value: 'add' },
          { name: '➖ Retirer de la blacklist', value: 'remove' }
        )
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('Raison de la mise sur liste noire (pour ajout)')
        .setRequired(false)
        .setMaxLength(250)
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Action réservée aux membres du staff.',
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('membre');
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

    if (action === 'check') {
      const entry = blacklist.get(targetUser.id);
      if (!entry) {
        return interaction.reply({
          content: `✅ Le membre **${targetUser.tag}** (\`${targetUser.id}\`) n'est **pas** sur liste noire.`,
          ephemeral: true
        });
      }

      const dateStr = new Date(entry.created_at).toLocaleString('fr-FR');
      const embed = new EmbedBuilder()
        .setColor(COLORS.DANGER)
        .setTitle(`🚫 Membre sur liste noire — ${targetUser.tag}`)
        .addFields(
          { name: 'Membre', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
          { name: 'Ajouté par', value: `<@${entry.added_by}> (\`${entry.added_by_tag || 'N/A'}\`)`, inline: true },
          { name: 'Date', value: dateStr, inline: true },
          { name: 'Raison', value: entry.reason || 'Non précisée' }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (action === 'add') {
      if (blacklist.isBlacklisted(targetUser.id)) {
        return interaction.reply({
          content: `⚠️ Le membre **${targetUser.tag}** est déjà sur la liste noire.`,
          ephemeral: true
        });
      }

      blacklist.add({
        userId: targetUser.id,
        userTag: targetUser.tag || targetUser.username,
        addedBy: interaction.user.id,
        addedByTag: interaction.user.tag || interaction.user.username,
        reason
      });

      return interaction.reply({
        content: `🚫 **${targetUser.tag}** a été ajouté à la liste noire.\n• Raison : *${reason}*\nSes futurs messages en MP seront ignorés par le bot.`
      });
    }

    if (action === 'remove') {
      if (!blacklist.isBlacklisted(targetUser.id)) {
        return interaction.reply({
          content: `ℹ️ Le membre **${targetUser.tag}** n'est pas sur la liste noire.`,
          ephemeral: true
        });
      }

      blacklist.remove(targetUser.id);

      return interaction.reply({
        content: `✅ **${targetUser.tag}** a été retiré de la liste noire avec succès.`
      });
    }
  }
};
