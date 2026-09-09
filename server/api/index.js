// Vercel serverless entrypoint. Unlike src/index.js (which listens on a port
// for local dev / a traditional host), Vercel invokes this handler per request
// and reuses the module across warm invocations of the same function instance —
// so the schema is initialized once per container, not per request.
import app from '../src/app.js';
import { initSchema } from '../src/db.js';

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null; // let the next request retry instead of caching a failure forever
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
