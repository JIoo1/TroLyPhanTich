import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';

export function ChatInput({
  disabled,
  onSend,
  onFile,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
  onFile: (file: File) => void;
}) {
  const [value, setValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!disabled && value.trim()) {
      onSend(value.trim());
      setValue('');
    }
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };
  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={keyDown}
        placeholder="Mô tả ý tưởng hoặc trả lời câu hỏi..."
        rows={1}
        disabled={disabled}
      />
      <div className="composer-bottom">
        <div className="composer-tools">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            className="tool-button"
            title="Đính kèm tài liệu"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={16} />
            <span>Tài liệu</span>
          </button>
          <span className="file-hint">TXT/MD có khối JSON</span>
        </div>
        <div className="send-side">
          <span>↵ gửi</span>
          <button
            className="send-button"
            disabled={disabled || !value.trim()}
            aria-label="Gửi tin nhắn"
          >
            <ArrowUp size={17} />
          </button>
        </div>
      </div>
    </form>
  );
}
