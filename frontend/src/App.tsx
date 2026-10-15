import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  Bot,
  ChevronDown,
  FileText,
  FolderOpen,
  Menu,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { api } from './api';
import { ChatInput } from './components/ChatInput';
import { MessageList } from './components/MessageList';
import { ProgressCard } from './components/ProgressCard';
import { RequirementPanel } from './components/RequirementPanel';
import type { ChatMessage, Progress, Requirement, SessionDto, SessionSummary } from './types';

const initialProgress: Progress = {
  stage: 'BUSINESS_GOAL',
  completion: 0,
  ready_for_report: false,
};
export default function App() {
  const [sessionId, setSessionId] = useState('');
  const [projectId, setProjectId] = useState('default');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [progress, setProgress] = useState(initialProgress);
  const [pending, setPending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [notice, setNotice] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [report, setReport] = useState<{ format: 'pdf' | 'docx'; downloadUrl: string } | null>(
    null,
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const refreshSessions = async () => setSessions(await api.listSessions());

  useEffect(() => {
    const saved = localStorage.getItem('ba-session-id');
    const initialize = async () => {
      try {
        let session: SessionDto | Omit<SessionDto, 'messages'> | null = null;
        if (saved) {
          try {
            session = await api.getSession(saved);
          } catch {
            localStorage.removeItem('ba-session-id');
          }
        }
        if (!session) session = await api.createSession();
        const activeSessionId = session.session_id;
        localStorage.setItem('ba-session-id', activeSessionId);
        setProjectId(session.project_id || 'default');
        setMessages(
          'messages' in session && Array.isArray(session.messages) ? session.messages : [],
        );
        setProgress(session.progress || initialProgress);
        setSessionId(activeSessionId);
        setRequirements(await api.getRequirements(activeSessionId));
        setSessions(await api.listSessions());
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Không thể kết nối backend.');
      } finally {
        setInitializing(false);
      }
    };
    void initialize();
  }, []);

  const send = async (text: string) => {
    if (!sessionId || pending) return;
    setPending(true);
    setNotice('');
    setMessages((current) => [
      ...current,
      { role: 'user', content: text, created_at: new Date().toISOString() },
    ]);
    try {
      const result = await api.chat(sessionId, text);
      setMessages((current) => [
        ...current,
        { ...result.message, suggestions: result.suggestions },
      ]);
      setProgress(result.progress);
      if (result.new_requirements.length) setRequirements(await api.getRequirements(sessionId));
      await refreshSessions();
      if (result.error) setNotice(result.error);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: 'Không gửi được tin nhắn. Hãy thử lại sau ít phút.' },
      ]);
      setNotice(error instanceof Error ? error.message : 'Đã xảy ra lỗi.');
    } finally {
      setPending(false);
    }
  };

  const openSession = async (id: string) => {
    if (pending || id === sessionId) return;
    setInitializing(true);
    setNotice('');
    try {
      const session = await api.getSession(id);
      localStorage.setItem('ba-session-id', id);
      setSessionId(id);
      setProjectId(session.project_id || 'default');
      setMessages(session.messages || []);
      setProgress(session.progress || initialProgress);
      setRequirements(await api.getRequirements(id));
      setReport(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không mở được phiên chat.');
    } finally {
      setInitializing(false);
    }
  };

  const removeSession = async (id: string) => {
    if (!window.confirm('Xóa phiên này cùng toàn bộ tin nhắn và yêu cầu đã lưu?')) return;
    try {
      await api.deleteSession(id);
      const remaining = await api.listSessions();
      setSessions(remaining);
      if (id === sessionId) {
        if (remaining.length) await openSession(remaining[0].session_id);
        else await reset();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không xóa được phiên.');
    }
  };

  const upload = async (file: File) => {
    setNotice('Đang nạp tài liệu…');
    try {
      const result = await api.upload(file, projectId);
      setNotice(result.message || `Đã gửi ${file.name} đến WF01.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không nạp được tài liệu.');
    }
  };
  const makeReport = async (format: 'pdf' | 'docx') => {
    if (!sessionId) return;
    setNotice('Đang soạn báo cáo…');
    try {
      const result = await api.report(sessionId, format);
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const downloadUrl = baseUrl
        ? new URL(result.download_url, baseUrl).href
        : result.download_url;
      setReport({ format, downloadUrl });
      setNotice(result.warning || 'Báo cáo đã sẵn sàng.');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `BRD-${sessionId.slice(0, 8)}.${format}`;
      link.click();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không tạo được báo cáo.');
    }
  };
  const reset = async () => {
    try {
      const fresh = await api.createSession();
      localStorage.setItem('ba-session-id', fresh.session_id);
      setSessionId(fresh.session_id);
      setProjectId(fresh.project_id);
      setMessages([]);
      setRequirements([]);
      setProgress(initialProgress);
      setReport(null);
      setNotice('');
      await refreshSessions();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không tạo được phiên mới.');
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={17} />
          </div>
          <div>
            ba<span>studio</span>
            <small>BUSINESS ANALYSIS WORKSPACE</small>
          </div>
        </div>
        <button className="new-chat" onClick={() => void reset()}>
          <Plus size={16} />
          Phiên khám phá mới
        </button>
        <div className="side-label">WORKSPACE</div>
        <div className="nav-item nav-active" aria-current="page">
          <FolderOpen size={16} />
          Dự án của tôi <ChevronDown size={14} className="nav-chevron" />
        </div>
        <div className="nav-item">
          <FileText size={16} />
          Tài liệu
        </div>
        <div className="side-label recent-label">CÁC PHIÊN TRƯỚC</div>
        <div className="session-list">
          {sessions.length === 0 && <div className="session-empty">Chưa có phiên nào</div>}
          {sessions.map((session) => (
            <div className={`session-entry ${session.session_id === sessionId ? 'session-current' : ''}`} key={session.session_id}>
              <button className="session-open" onClick={() => void openSession(session.session_id)} title={session.title || session.session_id}>
                <span className="recent-dot" />
                <span className="session-label">{session.title?.trim() || `Phiên ${session.session_id.slice(0, 8)}`}</span>
              </button>
              <button className="session-delete" onClick={() => void removeSession(session.session_id)} aria-label={`Xóa phiên ${session.session_id.slice(0, 8)}`} title="Xóa phiên">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <div className="workspace-profile">
          <div className="profile-avatar">A</div>
          <div>
            <strong>Analyst Workspace</strong>
            <span>Free plan</span>
          </div>
          <MoreHorizontal size={16} aria-hidden="true" />
        </div>
      </aside>
      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Projects</span>
            <b>/</b>
            <strong>BA Discovery Session</strong>
            <span className="saved-pill">
              <i />
              Đã lưu
            </span>
          </div>
          <div className="top-actions">
            <button
              className="icon-button mobile-menu"
              onClick={() => setPanelOpen(!panelOpen)}
              aria-label="Mở panel"
            >
              <Menu size={18} />
            </button>
            <button className="share-button" onClick={() => void makeReport('pdf')}>
              <ArrowDownToLine size={15} /> Xuất BRD
            </button>
            <span className="icon-button" aria-hidden="true">
              <MoreHorizontal size={18} />
            </span>
          </div>
        </header>
        <div className="chat-heading">
          <div className="session-kicker">
            <span>DISCOVERY</span>
            <span className="kicker-line" />
            <span>SESSION 01</span>
          </div>
          <h1>
            Phân tích nghiệp vụ <span>mới</span>
          </h1>
          <p>Khám phá yêu cầu · Khởi tạo dự án</p>
        </div>
        {initializing && (
          <div className="app-status" role="status">
            Đang kết nối backend và tải phiên chat…
          </div>
        )}
        {!initializing && !sessionId && (
          <div className="app-status app-status-error" role="alert">
            Không tải được phiên chat. Kiểm tra backend tại{' '}
            <code>http://localhost:3001/api/health</code>, rồi tải lại trang.
            {notice && <div>{notice}</div>}
          </div>
        )}
        <MessageList messages={messages} pending={pending} onSuggestion={send} onStart={send} />
        <div className="chat-footer">
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          <ChatInput disabled={pending || initializing || !sessionId} onSend={send} onFile={upload} />
          <div className="footer-note">
            <span>
              <i />
              Kết nối bảo mật
            </span>
            <span>BA Studio có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.</span>
          </div>
        </div>
      </section>
      <aside className={`right-panel ${panelOpen ? '' : 'panel-closed'}`}>
        <div className="right-header">
          <div className="panel-title">
            <span className="eyebrow">PROJECT INTELLIGENCE</span>
            <h2>Không gian dự án</h2>
          </div>
          <button
            className="icon-button close-panel"
            onClick={() => setPanelOpen(false)}
            aria-label="Đóng panel"
          >
            <X size={16} />
          </button>
        </div>
        <div className="project-card">
          <div className="project-icon">
            <Bot size={18} />
          </div>
          <div>
            <span>PROJECT ID</span>
            <strong>{projectId}</strong>
          </div>
          <span aria-hidden="true">
            <MoreHorizontal size={16} />
          </span>
        </div>
        <ProgressCard progress={progress} />
        <div className="panel-divider" />
        <RequirementPanel requirements={requirements} />
        <div className="report-box">
          <div className="report-icon">
            <FileText size={17} />
          </div>
          <div>
            <strong>Báo cáo BRD</strong>
            <span>
              {progress.ready_for_report ? 'Đã sẵn sàng xuất' : 'Tạo bản nháp bất cứ lúc nào'}
            </span>
          </div>
          <button onClick={() => void makeReport('pdf')} title="Tải PDF">
            <ArrowDownToLine size={15} />
          </button>
        </div>
        <div className="report-actions">
          <button onClick={() => void makeReport('pdf')}>Tải PDF</button>
          <button onClick={() => void makeReport('docx')}>Tải DOCX</button>
          {report && (
            <a href={report.downloadUrl} download={`BRD.${report.format}`}>
              Tải lại {report.format.toUpperCase()}
            </a>
          )}
        </div>
      </aside>
      {!panelOpen && (
        <button className="show-panel" onClick={() => setPanelOpen(true)}>
          <Menu size={16} /> Dự án
        </button>
      )}
    </main>
  );
}
