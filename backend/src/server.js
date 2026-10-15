import app from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDatabase() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.error(
        `MySQL connection attempt ${attempt}/${maxAttempts} failed (${error.code || error.message}); retrying in 5 seconds.`,
      );
      await delay(5000);
    }
  }
}

try {
  await waitForDatabase();
  app.listen(config.port, '0.0.0.0', () => console.log(`API listening on port ${config.port}`));
} catch (error) {
  console.error('Could not connect to MySQL after several attempts:', error.code || error.message);
  process.exit(1);
}
