import { pool } from '../db/pool.js';
import { callN8n } from '../services/n8nClient.js';
import { exportReport } from '../services/reportExporter.js';

export async function createReport(req, res, next) {
  const { sessionId } = req.params;
  const format = req.body.format;
  if (!['pdf', 'docx', 'html', 'markdown'].includes(format))
    return res.status(400).json({ error: 'INVALID_REQUEST' });
  try {
    const [[session]] = await pool.execute(
      'SELECT session_id, project_id, requirements_state, current_stage, completion, ready_for_report FROM ba_session WHERE session_id=?',
      [sessionId],
    );
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    const isComplete =
      Boolean(session.ready_for_report) || session.current_stage === 'DONE' || Number(session.completion) >= 100;
    if (format === 'docx' && !isComplete) {
      return res.status(409).json({ error: 'Phiên chưa hoàn tất, chưa thể xuất DOCX.' });
    }
    const result = await callN8n('ba-chat', {
      action: 'report',
      session_id: sessionId,
      project_id: session.project_id,
      requirements_state: session.requirements_state
        ? JSON.parse(session.requirements_state)
        : null,
    });
    if (result.success !== true)
      return res.status(502).json({ error: result.error || 'REPORT_GENERATION_FAILED' });
    const html = result.html || '';
    const markdown = result.markdown || '';
    if (!html && !markdown)
      return res.status(502).json({ error: 'n8n không trả về html hoặc markdown.' });
    if (format === 'html' || format === 'markdown') {
      const content = format === 'html' ? html : markdown;
      if (!content) return res.status(502).json({ error: `n8n không trả về ${format}.` });
      await pool.execute('INSERT INTO ba_report (session_id, format, file_path) VALUES (?, ?, ?)', [
        sessionId,
        format,
        null,
      ]);
      return res.json({
        format,
        content,
        warning: session.requirements_state ? null : 'Phiên chưa có dữ liệu yêu cầu.',
      });
    }
    let messages = [];
    if (format === 'docx') {
      const [rows] = await pool.execute(
        'SELECT role, content, suggestions, created_at FROM ba_message WHERE session_id=? ORDER BY id ASC',
        [sessionId],
      );
      messages = rows.map((message) => {
        let suggestions = message.suggestions;
        if (typeof suggestions === 'string') {
          try {
            suggestions = JSON.parse(suggestions);
          } catch {
            suggestions = [];
          }
        }
        return {
          role: message.role,
          content: message.content,
          suggestions: Array.isArray(suggestions) ? suggestions : [],
          created_at: message.created_at,
        };
      });
    }
    const file = await exportReport({ sessionId, format, html, markdown, messages });
    const [insert] = await pool.execute(
      'INSERT INTO ba_report (session_id, format, file_path) VALUES (?, ?, ?)',
      [sessionId, format, file.path],
    );
    res.json({
      report_id: insert.insertId,
      format,
      download_url: `/api/reports/${insert.insertId}/download`,
      warning: session.requirements_state ? null : 'Phiên chưa có dữ liệu yêu cầu.',
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadReport(req, res, next) {
  try {
    const [[report]] = await pool.execute('SELECT file_path, format FROM ba_report WHERE id=?', [
      req.params.reportId,
    ]);
    if (!report?.file_path) return res.status(404).json({ error: 'Không tìm thấy file báo cáo.' });
    res.download(report.file_path, `BRD-${req.params.reportId}.${report.format}`);
  } catch (error) {
    next(error);
  }
}
