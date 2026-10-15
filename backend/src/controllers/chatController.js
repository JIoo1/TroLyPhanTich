import { z } from 'zod';
import { createSession, getSession, sendChat, listRequirements, listSessions, deleteSession } from '../services/chatService.js';

export async function sessions(_req, res, next) {
  try {
    res.json({ sessions: await listSessions() });
  } catch (error) {
    next(error);
  }
}

export async function removeSession(req, res, next) {
  try {
    if (!(await deleteSession(req.params.sessionId))) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function newSession(_req, res, next) {
  try {
    res.status(201).json(await createSession());
  } catch (error) {
    next(error);
  }
}
export async function readSession(req, res, next) {
  try {
    const data = await getSession(req.params.sessionId);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
export async function chat(req, res, next) {
  const parsed = z
    .object({ session_id: z.string().uuid(), message: z.string().trim().min(1).max(10000) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_REQUEST' });
  try {
    const result = await sendChat({
      sessionId: parsed.data.session_id,
      message: parsed.data.message,
    });
    res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
}
export async function requirements(req, res, next) {
  try {
    res.json({ requirements: await listRequirements(req.params.sessionId) });
  } catch (error) {
    next(error);
  }
}
