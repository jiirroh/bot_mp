/**
 * Commande Slash /config : Visualisation et modification des paramètres du bot.
 */

const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const settings = require('../database/settings');
const { COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure les paramètres du bot de relais MP')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('afficher')
        .setDescription('Affiche la configuration active du bot')
    )
    .addSubcommand(sub =>
      sub
        .setName('salon_staff')
        .setDescription('Définit le salon où les fils de tickets sont créés')
        .addChannelOption(opt =>
          opt
            .setName('salon')
            .setDescription('Salon textuel du staff')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('salon_logs')
        .setDescription('Définit le salon où les logs et transcripts sont archivés')
        .addChannelOption(opt =>
          opt
            .setName('salon')
            .setDescription('Salon textuel des logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('roles_staff')
        .setDescription('Définit la liste des rôles staff autorisés (séparés par des virgules)')
        .addStringOption(opt =>
          opt
            .setName('ids')
            .setDescription('IDs des rôles staff séparés par des virgules (ex: 123456,789101)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('mode_defaut')
        .setDescription('Définit le mode d\'identité par défaut')
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Mode par défaut')
            .setRequired(true)
            .addChoices(
              { name: '🕵️ Anonyme', value: 'anonymous' },
              { name: '👤 Nommé', value: 'named' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('message_auto')
        .setDescription('Définit la réponse automatique pour les MP hors ticket')
        .addStringOption(opt =>
          opt
            .setName('message')
            .setDescription('Texte du message automatique')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('message_cloture')
        .setDescription('Définit le message envoyé au membre lors de la clôture')
        .addStringOption(opt =>
          opt
            .setName('message')
            .setDescription('Texte du message de clôture')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Vérification : commande réservée aux administrateurs
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Seuls les administrateurs du serveur peuvent modifier la configuration.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'afficher') {
      const all = settings.getAll();

      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('⚙️ Configuration active du bot de relais MP')
        .setDescription('Paramètres actuels enregistrés en base de données et dans le fichier `.env` :')
        .addFields(
          {
            name: '🏢 Salon staff (création des fils)',
            value: all.staff_channel_id ? `<#${all.staff_channel_id}> (\`${all.staff_channel_id}\`)` : '*Non configuré*',
            inline: false
          },
          {
            name: '📑 Salon des logs et transcripts',
            value: all.log_channel_id ? `<#${all.log_channel_id}> (\`${all.log_channel_id}\`)` : '*Non configuré*',
            inline: false
          },
          {
            name: '🛡️ Rôles staff autorisés',
            value: all.staff_role_ids
              ? all.staff_role_ids.split(',').map(r => `<@&${r.trim()}>`).join(', ') || '`' + all.staff_role_ids + '`'
              : '*Tous les membres avec permission "Gérer les messages"*',
            inline: false
          },
          {
            name: '🎭 Mode par défaut',
            value: all.default_mode === 'named' ? '👤 **Nommé**' : '🕵️ **Anonyme**',
            inline: true
          },
          {
            name: '💬 Réponse automatique (MP hors ticket)',
            value: `>>> ${all.auto_reply_message || '*Par défaut*'}`,
            inline: false
          },
          {
            name: '🔒 Message de clôture (MP)',
            value: `>>> ${all.close_message || '*Par défaut*'}`,
            inline: false
          }
        )
        .setFooter({ text: 'Utilisez /config <sous-commande> pour modifier une valeur' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'salon_staff') {
      const channel = interaction.options.getChannel('salon');
      settings.set('staff_channel_id', channel.id);
      return interaction.reply({
        content: `✅ Salon staff mis à jour : <#${channel.id}>. Les nouveaux fils de tickets y seront créés.`,
        ephemeral: true
      });
    }

    if (subcommand === 'salon_logs') {
      const channel = interaction.options.getChannel('salon');
      settings.set('log_channel_id', channel.id);
      return interaction.reply({
        content: `✅ Salon de logs mis à jour : <#${channel.id}>. Les transcripts y seront envoyés à chaque clôture.`,
        ephemeral: true
      });
    }

    if (subcommand === 'roles_staff') {
      const rolesInput = interaction.options.getString('ids');
      settings.set('staff_role_ids', rolesInput);
      return interaction.reply({
        content: `✅ Rôles staff mis à jour : \`${rolesInput}\`.`,
        ephemeral: true
      });
    }

    if (subcommand === 'mode_defaut') {
      const mode = interaction.options.getString('mode');
      settings.set('default_mode', mode);
      return interaction.reply({
        content: `✅ Mode par défaut mis à jour : **${mode === 'anonymous' ? 'Anonyme' : 'Nommé'}**.`,
        ephemeral: true
      });
    }

    if (subcommand === 'message_auto') {
      const msg = interaction.options.getString('message');
      settings.set('auto_reply_message', msg);
      return interaction.reply({
        content: `✅ Message de réponse automatique mis à jour.`,
        ephemeral: true
      });
    }

    if (subcommand === 'message_cloture') {
      const msg = interaction.options.getString('message');
      settings.set('close_message', msg);
      return interaction.reply({
        content: `✅ Message de clôture mis à jour.`,
        ephemeral: true
      });
    }
  }
};
