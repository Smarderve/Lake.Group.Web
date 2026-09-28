import express from 'express';
import { createFormsApp, mountFormsTerminalHandlers } from './forms-app.js';

const PRIVATE_PATHS = ['/backend', '/cms', '/docs', '/scripts', '/tests', '/deployment'];

/** Local-only composition: the unchanged real forms API precedes the protected website static server. */
export function createLocalFormsApp({ root, logger, ...formsOptions } = {}) {
  const app = createFormsApp({ logger, ...formsOptions, trustProxy: 0, hsts: false, terminalHandlers: false });
  app.use(PRIVATE_PATHS, (_req, res) => res.status(404).end());
  app.use(express.static(root, { dotfiles: 'deny', index: 'index.html' }));
  return mountFormsTerminalHandlers(app, { logger });
}
