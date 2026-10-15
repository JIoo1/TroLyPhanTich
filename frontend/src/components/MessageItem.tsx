import { Bot, Check, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage } from '../types';

export function MessageItem({
  message,
  onSuggestion,
  pending = false,
}: {
  message: ChatMessage;
  onSuggestion?: (text: string) => void;
  pending?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const user = message.role === 'user';
  const sendSelected = () => {
    if (!selected.length || pending) return;
    onSuggestion?.(`Tôi chọn các gợi ý sau:\n${selected.map((item) => `- ${item}`).join('\n')}`);
    setSelected([]);
  };

  return (
    <div className={`message-row ${user ? 'message-user' : ''}`}>
      <div className={`avatar ${user ? 'avatar-user' : ''}`}>
        {user ? <UserRound size={16} /> : <Bot size={17} />}
      </div>
      <div className="message-body">
        {!user && (
          <div className="message-name">
            BA Assistant <span>· Trợ lý nghiệp vụ</span>
          </div>
        )}
        <div className={`bubble ${user ? 'bubble-user' : ''}`}>{message.content}</div>
        {message.suggestions?.length ? (
          <div className="suggestions">
            {message.suggestions.map((item) => {
              const isSelected = selected.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  className={isSelected ? 'suggestion-selected' : ''}
                  aria-pressed={isSelected}
                  disabled={pending}
                  onClick={() => setSelected((current) =>
                    current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
                  )}
                >
                  {item}
                  {isSelected && <Check size={13} aria-hidden="true" />}
                </button>
              );
            })}
            {selected.length > 0 && (
              <button type="button" className="suggestion-submit" disabled={pending} onClick={sendSelected}>
                Gửi {selected.length} lựa chọn
              </button>
            )}
          </div>
        ) : null}
      </div>
      {user && (
        <div className="message-time">
          {message.created_at
            ? new Date(message.created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Vừa xong'}
        </div>
      )}
    </div>
  );
}
