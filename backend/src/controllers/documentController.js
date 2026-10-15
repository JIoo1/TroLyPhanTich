import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { callN8n } from '../services/n8nClient.js';
import { prepareKnowledgeDocument } from '../services/knowledgeDocument.js';

export async function ingest(req, res, next) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Vui lòng chọn tài liệu.' });
  const projectId = req.body.project_id || config.projectId;
  const documentId = randomUUID();
  try {
    // Forward the uploaded binary and document metadata as multipart form data.
    const bytes = await fs.readFile(file.path);
    const prepared = prepareKnowledgeDocument(bytes.toString('utf8'), {
      projectId,
      documentId,
      documentName: file.originalname,
    });
    const form = new FormData();
    form.set('project_id', projectId);
    form.set('document_id', documentId);
    form.set('document_name', file.originalname);
    // WF01's Webhook node explicitly configures binaryPropertyName="data".
    form.set(
      'data',
      new Blob([prepared.content], { type: 'text/plain; charset=utf-8' }),
      file.originalname,
    );
    const response = await callN8n('ba-ingest', form);
    if (response.success !== true)
      return res.status(502).json({
        error: response.error || 'INGEST_FAILED',
        message: response.message || 'WF01 không nạp được tài liệu.',
      });
    const chunks = response.chunks == null ? prepared.chunks : Number(response.chunks);
    res.status(202).json({
      document_id: documentId,
      document_name: file.originalname,
      success: true,
      chunks,
      message: response.message || `WF01 đã nạp ${chunks} đoạn từ ${file.originalname}.`,
    });
  } catch (error) {
    next(error);
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
}
