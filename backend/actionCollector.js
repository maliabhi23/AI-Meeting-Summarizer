import fs from 'fs';
import { nowISO } from './utils.js';

const LOG_FILE = './actions.log';

export function actionCollector(req, res, next) {
  const entry = {
    ts: nowISO(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    path: req.path,
    method: req.method,
    action: req.headers['x-action'] || 'unknown',
    meta: {
      ua: req.headers['user-agent'],
    }
  };
  fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', () => {});
  next();
}
