// Frontend DTO contract. Backend owns n8n mapping and requirements_state.
export type Role = 'user' | 'assistant';
export type ChatMessage = {
  id?: number;
  role: Role;
  content: string;
  created_at?: string;
  suggestions?: string[];
  meta?: Record<string, unknown> | null;
};
export type Requirement = {
  code: string;
  category?: string;
  content: string;
  status?: string;
  source?: string;
  confidence?: number | null;
};
export type Progress = { stage: string; completion: number; ready_for_report: boolean };
export type SessionDto = {
  session_id: string;
  project_id: string;
  messages: ChatMessage[];
  progress: Progress;
};
export type SessionSummary = {
  session_id: string;
  project_id: string;
  current_stage: string;
  completion: number;
  updated_at: string;
  title: string | null;
  message_count: number;
};
export type ChatResponse = {
  message: ChatMessage;
  suggestions: string[];
  progress: Progress;
  new_requirements: Requirement[];
  error: string | null;
};
