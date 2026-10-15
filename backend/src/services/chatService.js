import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { callN8n } from './n8nClient.js';
import { validateChatTurn } from './n8nContract.js';

const asObject = (value) =>
  typeof value === 'string' ? JSON.parse(value || 'null') || null : value;
const asArray = (value) => (Array.isArray(value) ? value : []);

export async function createSession() {
  const sessionId = randomUUID();
  await pool.execute('INSERT INTO ba_session (session_id, project_id) VALUES (?, ?)', [
    sessionId,
    config.projectId,
  ]);
  return {
    session_id: sessionId,
    project_id: config.projectId,
    progress: { stage: 'BUSINESS_GOAL', completion: 0, ready_for_report: false },
  };
}

export async function getSession(sessionId) {
  const [sessions] = await pool.execute('SELECT * FROM ba_session WHERE session_id = ?', [
    sessionId,
  ]);
  if (!sessions.length) return null;
  const [messages] = await pool.execute(
    'SELECT id, role, content, suggestions, meta, created_at FROM ba_message WHERE session_id = ? ORDER BY id ASC',
    [sessionId],
  );
  const session = sessions[0];
  return {
    session_id: session.session_id,
    project_id: session.project_id,
    progress: {
      stage: session.current_stage,
      completion: session.completion,
      ready_for_report: Boolean(session.ready_for_report),
    },
    messages: messages.map((message) => ({
      ...message,
      suggestions: asArray(asObject(message.suggestions)),
      meta: asObject(message.meta),
    })),
  };
}

export async function listSessions() {
  const [rows] = await pool.execute(
    `SELECT s.session_id, s.project_id, s.current_stage, s.completion, s.updated_at,
      (SELECT m.content FROM ba_message m WHERE m.session_id = s.session_id AND m.role = 'user' ORDER BY m.id ASC LIMIT 1) AS title,
      (SELECT COUNT(*) FROM ba_message m WHERE m.session_id = s.session_id) AS message_count
     FROM ba_session s ORDER BY s.updated_at DESC, s.created_at DESC`,
  );
  return rows;
}

export async function deleteSession(sessionId) {
  const [result] = await pool.execute('DELETE FROM ba_session WHERE session_id = ?', [sessionId]);
  return result.affectedRows > 0;
}

export async function sendChat({ sessionId, message }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[session]] = await connection.execute(
      'SELECT * FROM ba_session WHERE session_id = ? FOR UPDATE',
      [sessionId],
    );
    if (!session) {
      await connection.rollback();
      return { status: 404, body: { error: 'Không tìm thấy phiên chat.' } };
    }
    const [historyRows] = await connection.execute(
      'SELECT role, content FROM ba_message WHERE session_id = ? ORDER BY id DESC LIMIT 20',
      [sessionId],
    );
    const history = historyRows.reverse();
    let result;
    try {
      result = await callN8n('ba-chat', {
        action: 'chat',
        session_id: sessionId,
        project_id: session.project_id,
        message,
        requirements_state: asObject(session.requirements_state),
        history,
      });
    } catch (error) {
      await connection.rollback();
      return {
        status: 200,
        body: {
          message: { role: 'assistant', content: 'Hệ thống AI đang bận, vui lòng thử lại.' },
          suggestions: [],
          progress: {
            stage: session.current_stage,
            completion: session.completion,
            ready_for_report: Boolean(session.ready_for_report),
          },
          new_requirements: [],
          error: error.message,
        },
      };
    }
    const validation = validateChatTurn(result);
    if (!validation.success) {
      await connection.rollback();
      return { status: 502, body: { error: 'INVALID_N8N_RESPONSE', details: validation.error } };
    }
    result = validation.data;
    const responseText = result.response;
    const persist = result.success === true && result.persist === true;
    let progress = {
      stage: session.current_stage,
      completion: session.completion,
      ready_for_report: Boolean(session.ready_for_report),
    };
    const newRequirements = asArray(result.new_requirements);
    if (persist) {
      await connection.execute(
        "INSERT INTO ba_message (session_id, role, content) VALUES (?, 'user', ?)",
        [sessionId, message],
      );
      const [assistantInsert] = await connection.execute(
        "INSERT INTO ba_message (session_id, role, content, suggestions, meta) VALUES (?, 'assistant', ?, ?, ?)",
        [
          sessionId,
          responseText,
          JSON.stringify(asArray(result.suggestions)),
          JSON.stringify({ intent: result.intent, next_question: result.next_question }),
        ],
      );
      for (const requirement of newRequirements) {
        if (!requirement.code && !requirement.requirement_code) continue;
        await connection.execute(
          `INSERT INTO ba_requirement (session_id, requirement_code, category, content, source, status, confidence, actor, evidence, message_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE category=VALUES(category), content=VALUES(content), source=VALUES(source), status=VALUES(status), confidence=VALUES(confidence), actor=VALUES(actor), evidence=VALUES(evidence), message_id=VALUES(message_id)`,
          [
            sessionId,
            requirement.code || requirement.requirement_code,
            requirement.category || null,
            requirement.content || '',
            requirement.source || null,
            requirement.status || null,
            requirement.confidence ?? null,
            requirement.actor || null,
            requirement.evidence || null,
            assistantInsert.insertId,
          ],
        );
      }
      // Persist the exact state returned by WF02 (including an explicit null).
      const state = result.requirements_state;
      const stage = result.progress?.stage || result.stage || session.current_stage;
      const completion = Number(result.completion);
      const ready = Boolean(result.ready_for_report);
      const status = stage === 'DONE' ? 'DONE' : session.status;
      const [update] = await connection.execute(
        'UPDATE ba_session SET requirements_state=?, current_stage=?, completion=?, ready_for_report=?, status=?, version=version+1 WHERE session_id=? AND version=?',
        [
          state == null ? null : JSON.stringify(state),
          stage,
          completion,
          ready,
          status,
          sessionId,
          session.version,
        ],
      );
      if (update.affectedRows !== 1) {
        await connection.rollback();
        return { status: 409, body: { error: 'Phiên đang được xử lý, vui lòng gửi lại.' } };
      }
      progress = { stage, completion, ready_for_report: ready };
    }
    await connection.commit();
    return {
      status: 200,
      body: {
        message: { role: 'assistant', content: responseText, created_at: new Date().toISOString() },
        suggestions: asArray(result.suggestions),
        progress,
        new_requirements: newRequirements,
        error: result.success === false ? result.error || null : null,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listRequirements(sessionId) {
  const [rows] = await pool.execute(
    'SELECT requirement_code AS code, category, content, source, status, confidence, actor, evidence FROM ba_requirement WHERE session_id = ? ORDER BY id ASC',
    [sessionId],
  );
  return rows;
}
