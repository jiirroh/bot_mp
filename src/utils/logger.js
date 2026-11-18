/**
 * Utilitaire de journalisation (logger) stylisé pour la console.
 * Permet un suivi clair des opérations du bot avec horodatage et niveaux de criticité.
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  info: (msg, ...args) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.cyan}[INFO]${colors.reset} ${msg}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.green}[SUCCÈS]${colors.reset} ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.yellow}[ATTENTION]${colors.reset} ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}[ERREUR]${colors.reset} ${msg}`, ...args);
  },
  relay: (msg, ...args) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.magenta}[RELAIS]${colors.reset} ${msg}`, ...args);
  },
  debug: (msg, ...args) => {
    if (process.env.DEBUG === 'true') {
      console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.dim}[DEBUG] ${msg}${colors.reset}`, ...args);
    }
  }
};

module.exports = logger;
