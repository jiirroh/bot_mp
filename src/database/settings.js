/**
 * Gestion des paramètres dynamiques en base de données avec fallback sur la configuration .env.
 */

const db = require('./db');
const config = require('../config');

const settings = {
  /**
   * Récupère la valeur d'un paramètre en base, ou la valeur de config par défaut.
   */
  get(key) {
    const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`);
    const row = stmt.get(key);
    if (row && row.value !== undefined) {
      return row.value;
    }

    // Valeurs de secours issues du fichier .env
    switch (key) {
      case 'staff_channel_id':
        return config.staffChannelId;
      case 'log_channel_id':
        return config.logChannelId;
      case 'staff_role_ids':
        return config.staffRoleIds.join(',');
      case 'default_mode':
        return config.defaultMode;
      case 'auto_reply_message':
        return config.autoReplyMessage;
      case 'close_message':
        return config.closeMessage;
      default:
        return null;
    }
  },

  /**
   * Définit ou met à jour la valeur d'un paramètre en base.
   */
  set(key, value) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    return stmt.run(key, String(value), Date.now());
  },

  /**
   * Récupère tous les paramètres enregistrés en base.
   */
  getAll() {
    const stmt = db.prepare(`SELECT key, value FROM settings`);
    const rows = stmt.all();
    const result = {
      staff_channel_id: this.get('staff_channel_id'),
      log_channel_id: this.get('log_channel_id'),
      staff_role_ids: this.get('staff_role_ids'),
      default_mode: this.get('default_mode'),
      auto_reply_message: this.get('auto_reply_message'),
      close_message: this.get('close_message')
    };

    for (const row of rows) {
      result[row.key] = row.value;
    }

    return result;
  }
};

module.exports = settings;
