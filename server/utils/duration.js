/**
 * Parses duration strings like '7d', '24h', '30m', '60s' or numeric strings into milliseconds.
 *
 * @param {string|number} duration
 * @param {number} fallbackMs Default 7 days
 * @returns {number}
 */
function parseDurationMs(duration, fallbackMs = 7 * 24 * 60 * 60 * 1000) {
  if (!duration) return fallbackMs;
  if (typeof duration === 'number') return duration;

  const str = String(duration).trim().toLowerCase();
  const match = str.match(/^(\d+(?:\.\d+)?)\s*([smhdw]?)$/);
  if (!match) return fallbackMs;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'ms';

  switch (unit) {
    case 's':
      return Math.round(value * 1000);
    case 'm':
      return Math.round(value * 60 * 1000);
    case 'h':
      return Math.round(value * 60 * 60 * 1000);
    case 'd':
      return Math.round(value * 24 * 60 * 60 * 1000);
    case 'w':
      return Math.round(value * 7 * 24 * 60 * 60 * 1000);
    default:
      return Math.round(value);
  }
}

module.exports = {
  parseDurationMs,
  parseDurationToMs: parseDurationMs,
};
