import type { ChatResponse, SessionDto, Requirement, SessionSummary } from './types';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // These endpoints are stateful; avoid conditional requests that can return an
  // empty 304 response and leave the UI without its session data.
  const response = await fetch(`${API}${path}`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Yêu cầu thất bại (${response.status})`);
  return data as T;
}
export const api = {
  createSession: () => request<Omit<SessionDto, 'messages'>>('/sessions', { method: 'POST' }),
  listSessions: async () => {
    const data = await request<{ sessions?: SessionSummary[] }>('/sessions');
    return Array.isArray(data.sessions) ? data.sessions : [];
  },
  deleteSession: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),
  getSession: (id: string) => request<SessionDto>(`/sessions/${id}`),
  getRequirements: async (id: string) => {
    const data = await request<{ requirements?: Requirement[] }>(`/sessions/${id}/requirements`);
    return Array.isArray(data.requirements) ? data.requirements : [];
  },
  chat: (session_id: string, message: string) =>
    request<ChatResponse>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, message }),
    }),
  upload: (file: File, projectId: string) => {
    const body = new FormData();
    body.set('file', file);
    body.set('project_id', projectId);
    return request<{ message: string }>('/documents', { method: 'POST', body });
  },
  report: (id: string, format: 'pdf' | 'docx') =>
    request<{ report_id: number; format: string; download_url: string; warning: string | null }>(
      `/sessions/${id}/report`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      },
    ),
};
