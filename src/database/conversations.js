/**
 * Gestion des conversations dans la base de données.
 */

const db = require('./db');

const conversations = {
  /**
   * Crée une nouvelle conversation en base de données.
   */
  create({ userId, guildId, channelId, threadId, initialMode, openedBy, openedByTag }) {
    const stmt = db.prepare(`
      INSERT INTO conversations (
        user_id, guild_id, channel_id, thread_id, status,
        current_mode, opened_by, opened_by_tag, created_at
      ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)
    `);

    const now = Date.now();
    const info = stmt.run(
      userId,
      guildId,
      channelId,
      threadId,
      initialMode || 'anonymous',
      openedBy,
      openedByTag,
      now
    );

    return this.getById(info.lastInsertRowid);
  },

  /**
   * Récupère la conversation active d'un membre (s'il en a une).
   */
  getActiveByUser(userId) {
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE user_id = ? AND status = 'open'
      LIMIT 1
    `);
    return stmt.get(userId);
  },

  /**
   * Récupère une conversation par l'ID de son thread Discord.
   */
  getByThread(threadId) {
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE thread_id = ?
      LIMIT 1
    `);
    return stmt.get(threadId);
  },

  /**
   * Récupère une conversation par son ID primaire.
   */
  getById(id) {
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE id = ?
      LIMIT 1
    `);
    return stmt.get(id);
  },

  /**
   * Met à jour le mode d'identité actif de la conversation ('anonymous' ou 'named').
   */
  updateMode(threadId, newMode) {
    const stmt = db.prepare(`
      UPDATE conversations
      SET current_mode = ?
      WHERE thread_id = ?
    `);
    return stmt.run(newMode, threadId);
  },

  /**
   * Définit une surcharge ponctuelle de mode pour le tout prochain message envoyé.
   */
  setNextModeOverride(threadId, modeOverride) {
    const stmt = db.prepare(`
      UPDATE conversations
      SET next_mode_override = ?
      WHERE thread_id = ?
    `);
    return stmt.run(modeOverride, threadId);
  },

  /**
   * Réinitialise la surcharge ponctuelle de mode après envoi du message.
   */
  clearNextModeOverride(threadId) {
    const stmt = db.prepare(`
      UPDATE conversations
      SET next_mode_override = NULL
      WHERE thread_id = ?
    `);
    return stmt.run(threadId);
  },

  /**
   * Clôture une conversation.
   */
  close(threadId, { closedBy, closedByTag, reason }) {
    const stmt = db.prepare(`
      UPDATE conversations
      SET status = 'closed',
          closed_by = ?,
          closed_by_tag = ?,
          close_reason = ?,
          closed_at = ?
      WHERE thread_id = ?
    `);
    return stmt.run(closedBy, closedByTag, reason || null, Date.now(), threadId);
  },

  /**
   * Récupère l'historique complet des conversations passées et présentes d'un membre.
   */
  getUserHistory(userId) {
    const stmt = db.prepare(`
      SELECT c.*,
             COUNT(m.id) AS total_messages
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return stmt.all(userId);
  }
};

module.exports = conversations;
