import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { config } from '../config.js';
import { chat, newSession, readSession, requirements, sessions, removeSession } from '../controllers/chatController.js';
import { ingest } from '../controllers/documentController.js';
import { createReport, downloadReport } from '../controllers/reportController.js';

fs.mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  dest: config.uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = /\.(txt|md)$/i.test(file.originalname);
    if (!allowed) {
      const error = new Error('WF01 hiện chỉ đọc file TXT/MD có các khối JSON theo mẫu.');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});
const router = Router();
router.post('/sessions', newSession);
router.get('/sessions', sessions);
router.delete('/sessions/:sessionId', removeSession);
router.get('/sessions/:sessionId', readSession);
router.get('/sessions/:sessionId/requirements', requirements);
router.post('/chat', chat);
router.post('/documents', upload.single('file'), ingest);
router.post('/sessions/:sessionId/report', createReport);
router.get('/reports/:reportId/download', downloadReport);
export default router;
