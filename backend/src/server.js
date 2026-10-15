import app from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

try {
  await pool.query('SELECT 1');
  app.listen(config.port, () => console.log(`API đang chạy tại http://localhost:${config.port}`));
} catch (error) {
  console.error(
    'Không kết nối được MySQL. Hãy bật MySQL trong XAMPP và kiểm tra .env.',
    error.message,
  );
  process.exit(1);
}
