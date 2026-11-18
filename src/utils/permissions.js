/**
 * Vérification des permissions staff pour les commandes et interactions.
 */

const { PermissionsBitField } = require('discord.js');
const settings = require('../database/settings');

/**
 * Vérifie si un membre possède les droits staff.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isStaff(member) {
  if (!member) return false;

  // 1. Propriétaire du serveur ou Administrateur
  if (member.id === member.guild.ownerId) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  // 2. Rôles staff configurés (dans la base de données ou dans le .env)
  const configuredRoles = (settings.get('staff_role_ids') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (configuredRoles.length === 0) {
    // Si aucun rôle n'est spécifié, autoriser ceux avec la permission de gérer les messages
    return member.permissions.has(PermissionsBitField.Flags.ManageMessages);
  }

  // Vérifier si le membre possède au moins un des rôles listés
  return member.roles.cache.some(role => configuredRoles.includes(role.id));
}

module.exports = { isStaff };
