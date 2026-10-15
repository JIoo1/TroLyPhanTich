import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const config = {
  port: Number(process.env.PORT || 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  projectId: process.env.PROJECT_ID || 'default',
  uploadDir: path.resolve(here, '../storage/uploads'),
  reportDir: path.resolve(here, '../storage/reports'),
  n8nBaseUrl: (process.env.N8N_BASE_URL || '').replace(/\/$/, ''),
  n8nTimeoutMs: Math.max(90000, Number(process.env.N8N_TIMEOUT_MS || 90000)),
  n8nApiKey: process.env.N8N_API_KEY || '',
};
