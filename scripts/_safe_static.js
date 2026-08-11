'use strict';
/**
 * SECURITY_ROADMAP Phase 14 — shared path-containment resolver for the
 * localhost verification static servers (scripts/_verify_*.js).
 *
 * Returns the absolute path inside `root` for a request URL path, or null
 * when the URL is malformed or would escape the root:
 *
 *   - percent-encoding is decoded safely (malformed URI → null)
 *   - ".." segments are resolved and the result must stay inside root,
 *     checked SEPARATOR-AWARE (root + path.sep) — this rejects sibling
 *     directories whose names merely share the root's prefix (the classic
 *     `startsWith(ROOT)` escape, e.g. a sibling `root2` directory)
 *   - null bytes are rejected outright
 *   - absolute paths resolve against root and are re-checked for containment
 */
const path = require('path');

function resolveStatic(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath || '/');
  } catch {
    return null; // malformed percent-encoding
  }
  if (decoded.includes('\0')) return null;
  const cleaned = decoded.split('?')[0];
  const base = path.resolve(root);
  // Prefix with './' so the request path is treated as relative to base —
  // a leading '/' cannot reset the resolution outside the root.
  const resolved = path.resolve(base, '.' + path.sep + cleaned.replace(/^[/\\]+/, ''));
  if (resolved === base) return resolved;
  if (resolved.startsWith(base + path.sep)) return resolved;
  return null;
}

module.exports = { resolveStatic };
