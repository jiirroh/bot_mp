/**
 * Limiteur de débit (Rate Limiter) par fenêtre glissante pour éviter les abus et le spam en MP.
 */

class RateLimiter {
  constructor(limit = 5, windowMs = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.timestamps = new Map();

    // Nettoyage régulier des entrées expirées (toutes les 5 minutes)
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Vérifie si un utilisateur peut envoyer un message.
   * @param {string} userId
   * @returns {boolean} true si autorisé, false si bloqué par le rate-limit
   */
  check(userId) {
    const now = Date.now();
    const userTimestamps = this.timestamps.get(userId) || [];

    // Filtre les timestamps dans la fenêtre active
    const recent = userTimestamps.filter(t => now - t < this.windowMs);

    if (recent.length >= this.limit) {
      return false;
    }

    recent.push(now);
    this.timestamps.set(userId, recent);
    return true;
  }

  /**
   * Nettoie les données obsolètes pour libérer la mémoire.
   */
  cleanup() {
    const now = Date.now();
    for (const [userId, times] of this.timestamps.entries()) {
      const valid = times.filter(t => now - t < this.windowMs);
      if (valid.length === 0) {
        this.timestamps.delete(userId);
      } else {
        this.timestamps.set(userId, valid);
      }
    }
  }
}

// 5 messages maximum par tranche de 10 secondes par utilisateur
module.exports = new RateLimiter(5, 10000);
