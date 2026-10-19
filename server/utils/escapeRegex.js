/**
 * Escapes user/DB-supplied text so it is matched literally inside a RegExp.
 * Prevents invalid-pattern crashes and regex-injection / ReDoS.
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive, whole-string literal match. */
const exactCI = (value) => new RegExp(`^${escapeRegex(value)}$`, 'i');

module.exports = { escapeRegex, exactCI };
