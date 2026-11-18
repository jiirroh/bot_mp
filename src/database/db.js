/**
 * Initialisation de la base de données SQLite via better-sqlite3.
 * Création des tables et optimisation avec le mode WAL (Write-Ahead Logging).
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// S'assure que le répertoire parent de la base existe
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.databasePath);

// Activation du mode WAL et vérification des clés étrangères pour les performances et l'intégrité
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Création des tables nécessaires au fonctionnement du bot de relais MP.
 */
function initDatabase() {
  // 1. Table des conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      thread_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open',
      current_mode TEXT NOT NULL DEFAULT 'anonymous',
      next_mode_override TEXT DEFAULT NULL,
      opened_by TEXT NOT NULL,
      opened_by_tag TEXT NOT NULL,
      closed_by TEXT DEFAULT NULL,
      closed_by_tag TEXT DEFAULT NULL,
      close_reason TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      closed_at INTEGER DEFAULT NULL
    );
  `);

  // Index pour retrouver rapidement une conversation active par membre ou par thread
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_user_status ON conversations(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_conversations_thread ON conversations(thread_id);
  `);

  // 2. Table des messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      discord_message_id TEXT DEFAULT NULL,
      sender_id TEXT NOT NULL,
      sender_tag TEXT NOT NULL,
      sender_avatar TEXT DEFAULT NULL,
      recipient_id TEXT NOT NULL,
      content TEXT,
      attachments TEXT,
      mode TEXT NOT NULL,
      direction TEXT NOT NULL,
      delivered INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
  `);

  // 3. Table de la liste noire (blacklist)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blacklist (
      user_id TEXT PRIMARY KEY,
      user_tag TEXT,
      added_by TEXT NOT NULL,
      added_by_tag TEXT,
      reason TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // 4. Table des réglages dynamiques
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  logger.info(`Base de données SQLite initialisée avec succès (${config.databasePath}).`);
}

initDatabase();

module.exports = db;
