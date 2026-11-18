/**
 * Gestion de l'historique des messages dans la base de données.
 */

const db = require('./db');

const messages = {
  /**
   * Enregistre un message dans la base de données.
   */
  insert({
    conversationId,
    discordMessageId = null,
    senderId,
    senderTag,
    senderAvatar = null,
    recipientId,
    content = '',
    attachments = [],
    mode,
    direction,
    delivered = 1
  }) {
    const stmt = db.prepare(`
      INSERT INTO messages (
        conversation_id, discord_message_id, sender_id, sender_tag,
        sender_avatar, recipient_id, content, attachments, mode,
        direction, delivered, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const attachmentsJson = typeof attachments === 'string' ? attachments : JSON.stringify(attachments);
    const now = Date.now();

    const info = stmt.run(
      conversationId,
      discordMessageId,
      senderId,
      senderTag,
      senderAvatar,
      recipientId,
      content,
      attachmentsJson,
      mode,
      direction,
      delivered ? 1 : 0,
      now
    );

    return info.lastInsertRowid;
  },

  /**
   * Récupère tous les messages associés à une conversation par ordre chronologique.
   */
  getByConversation(conversationId) {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(conversationId);
    return rows.map(row => {
      try {
        row.attachments = JSON.parse(row.attachments || '[]');
      } catch {
        row.attachments = [];
      }
      return row;
    });
  },

  /**
   * Compte le nombre total de messages dans une conversation.
   */
  countByConversation(conversationId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE conversation_id = ?
    `);
    return stmt.get(conversationId)?.count || 0;
  }
};

module.exports = messages;
