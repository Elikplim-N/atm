import app from '../server/src/app.js';
import { initSchema } from '../server/src/db.js';

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database unavailable' }));
    return;
  }
  return app(req, res);
}
