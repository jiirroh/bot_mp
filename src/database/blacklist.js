/**
 * Gestion de la liste noire (blacklist) des membres dans la base de données.
 */

const db = require('./db');

const blacklist = {
  /**
   * Vérifie si un membre est dans la liste noire.
   */
  isBlacklisted(userId) {
    const stmt = db.prepare(`
      SELECT 1 FROM blacklist
      WHERE user_id = ?
      LIMIT 1
    `);
    return !!stmt.get(userId);
  },

  /**
   * Récupère l'entrée blacklist d'un membre.
   */
  get(userId) {
    const stmt = db.prepare(`
      SELECT * FROM blacklist
      WHERE user_id = ?
      LIMIT 1
    `);
    return stmt.get(userId);
  },

  /**
   * Ajoute un membre à la liste noire.
   */
  add({ userId, userTag, addedBy, addedByTag, reason }) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO blacklist (
        user_id, user_tag, added_by, added_by_tag, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(userId, userTag || null, addedBy, addedByTag || null, reason || null, Date.now());
  },

  /**
   * Retire un membre de la liste noire.
   */
  remove(userId) {
    const stmt = db.prepare(`
      DELETE FROM blacklist
      WHERE user_id = ?
    `);
    return stmt.run(userId);
  },

  /**
   * Liste tous les membres sur la liste noire.
   */
  list() {
    const stmt = db.prepare(`
      SELECT * FROM blacklist
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }
};

module.exports = blacklist;
