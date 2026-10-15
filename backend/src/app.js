import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import api from './routes/index.js';
import { config } from './config.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', api);
app.use((error, _req, res, next) => {
  const status = error.status || (error.name === 'MulterError' ? 400 : 500);
  if (status >= 500) console.error(error);
  if (res.headersSent) return next(error);
  res.status(status).json({ error: error.message || 'Lỗi máy chủ.' });
});
export default app;
