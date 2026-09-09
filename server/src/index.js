import 'dotenv/config';
import app from './app.js';
import { initSchema } from './db.js';

const PORT = process.env.PORT || 4000;

try {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`ATM Service Quality API listening on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Failed to connect to the database:', err.message);
  process.exit(1);
}
