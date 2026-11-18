/**
 * Génération de transcripts détaillés pour l'archivage et l'audit des conversations.
 * Contient la totalité des échanges, les vrais auteurs, les modes d'envoi et les pièces jointes.
 */

const { AttachmentBuilder } = require('discord.js');

const transcript = {
  /**
   * Génère un fichier texte / markdown complet représentant l'historique de la conversation.
   * @param {Object} conversation
   * @param {Array} messageList
   * @param {Object} memberUser
   * @returns {import('discord.js').AttachmentBuilder}
   */
  generateFile(conversation, messageList, memberUser) {
    const lines = [];

    lines.push('================================================================================');
    lines.push(`                   TRANSCRIPT CONVERSATION RELAIS MP #${conversation.id}`);
    lines.push('================================================================================');
    lines.push(`Membre concerné    : ${memberUser ? memberUser.tag : 'Inconnu'} (ID: ${conversation.user_id})`);
    lines.push(`Initié par         : ${conversation.opened_by_tag} (ID: ${conversation.opened_by})`);
    lines.push(`Fermé par          : ${conversation.closed_by_tag || 'Non spécifié'} (ID: ${conversation.closed_by || 'N/A'})`);
    lines.push(`Raison de clôture  : ${conversation.close_reason || 'Aucune raison spécifiée'}`);
    lines.push(`Date d'ouverture   : ${new Date(conversation.created_at).toLocaleString('fr-FR')}`);
    lines.push(`Date de clôture    : ${conversation.closed_at ? new Date(conversation.closed_at).toLocaleString('fr-FR') : 'En cours'}`);
    lines.push(`Total de messages  : ${messageList.length}`);
    lines.push('================================================================================\n');

    lines.push('--- DÉBUT DE LA CONVERSATION ---\n');

    for (const msg of messageList) {
      const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR');
      const dateStr = new Date(msg.created_at).toLocaleDateString('fr-FR');

      let prefix = '';
      if (msg.direction === 'staff_to_user') {
        const modeBadge = msg.mode === 'anonymous' ? '[MODE ANONYME]' : '[MODE NOMMÉ]';
        const deliveryBadge = msg.delivered ? '✅ LIVRÉ' : '❌ ÉCHEC REMISE';
        prefix = `[STAFF -> MEMBRE] ${modeBadge} ${deliveryBadge}\nAuteur réel : ${msg.sender_tag} (${msg.sender_id})`;
      } else if (msg.direction === 'user_to_staff') {
        prefix = `[MEMBRE -> STAFF]\nAuteur : ${msg.sender_tag} (${msg.sender_id})`;
      } else if (msg.direction === 'internal_note') {
        prefix = `[NOTE INTERNE (NON ENVOYÉE)]\nAuteur : ${msg.sender_tag} (${msg.sender_id})`;
      }

      lines.push(`[${dateStr} ${timeStr}] ${prefix}`);
      lines.push(`Message :`);
      lines.push(msg.content ? msg.content : '(Pas de texte)');

      if (msg.attachments && msg.attachments.length > 0) {
        lines.push('Pièces jointes :');
        for (const att of msg.attachments) {
          lines.push(` - ${att.name || 'Fichier'}: ${att.url}`);
        }
      }

      lines.push('--------------------------------------------------------------------------------\n');
    }

    lines.push('--- FIN DE LA CONVERSATION ---');

    const buffer = Buffer.from(lines.join('\n'), 'utf-8');
    const filename = `transcript-ticket-${conversation.id}-${conversation.user_id}.txt`;

    return new AttachmentBuilder(buffer, { name: filename });
  }
};

module.exports = transcript;
