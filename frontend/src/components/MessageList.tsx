import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageItem } from './MessageItem';
import type { ChatMessage } from '../types';

export function MessageList({
  messages,
  pending,
  onSuggestion,
  onStart,
}: {
  messages: ChatMessage[];
  pending: boolean;
  onSuggestion: (text: string) => void;
  onStart: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  // Keep the effect callback's return value undefined; React reserves returns for cleanup functions.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);
  return (
    <div className="message-scroll">
      <div className="conversation-date">
        <span>HÔM NAY</span>
      </div>
      {messages.length === 0 && (
        <div className="welcome-block">
          <div className="welcome-icon">
            <Sparkles size={20} />
          </div>
          <p className="eyebrow">BA DISCOVERY</p>
          <h2>
            Bắt đầu với
            <br />
            <em>mục tiêu của bạn.</em>
          </h2>
          <p className="welcome-copy">
            Cùng làm rõ bài toán, người dùng và phạm vi để xây dựng bộ yêu cầu nghiệp vụ thật vững
            chắc.
          </p>
          <div className="starter-grid">
            {['Tôi muốn xây dựng ứng dụng đặt lịch', 'Giúp tôi phân tích quy trình hiện tại'].map(
              (item, i) => (
                <button key={item} onClick={() => onStart(item)}>
                  <span>0{i + 1}</span>
                  {item}
                  <b>↗</b>
                </button>
              ),
            )}
          </div>
        </div>
      )}
      {messages.map((message, index) => (
        <MessageItem
          key={message.id ?? `${message.role}-${index}`}
          message={message}
          onSuggestion={onSuggestion}
          pending={pending}
        />
      ))}
      {pending && (
        <div className="message-row">
          <div className="avatar">
            <Sparkles size={15} />
          </div>
          <div className="typing">
            <i />
            <i />
            <i />
            <span>Đang phân tích...</span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
