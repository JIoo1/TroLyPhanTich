import { Check, Circle, TriangleAlert } from 'lucide-react';
import type { Requirement } from '../types';

const categoryName: Record<string, string> = {
  GOAL: 'Mục tiêu',
  FUNCTIONAL: 'Chức năng',
  NON_FUNCTIONAL: 'Phi chức năng',
  BUSINESS: 'Nghiệp vụ',
  DATA: 'Dữ liệu',
  ACTOR: 'Đối tượng',
};
const statusIcon = (status = '') =>
  status === 'CONFIRMED' ? (
    <Check size={12} />
  ) : status === 'CONFLICT' ? (
    <TriangleAlert size={12} />
  ) : (
    <Circle size={10} />
  );
export function RequirementPanel({ requirements }: { requirements: Requirement[] }) {
  const groups = requirements.reduce<Record<string, Requirement[]>>((result, requirement) => {
    const key = requirement.category || 'OTHER';
    (result[key] ||= []).push(requirement);
    return result;
  }, {});
  return (
    <div className="panel-section">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">LIVE DOCUMENT</span>
          <h3>Yêu cầu nghiệp vụ</h3>
        </div>
        <span className="count-pill">{requirements.length}</span>
      </div>
      {!requirements.length ? (
        <div className="empty-panel">
          <div className="empty-mark">✳</div>
          <p>Chưa có yêu cầu nào</p>
          <span>Trao đổi thêm để hình thành bộ yêu cầu.</span>
        </div>
      ) : (
        Object.entries(groups).map(([category, items]) => (
          <section className="requirement-group" key={category}>
            <h4>{categoryName[category] || category.replaceAll('_', ' ')}</h4>
            {items.map((item) => (
              <article className="requirement-card" key={item.code}>
                <div
                  className={`status-mark status-${(item.status || 'PENDING_CONFIRMATION').toLowerCase()}`}
                >
                  {statusIcon(item.status)}
                </div>
                <div>
                  <div className="requirement-code">{item.code}</div>
                  <p>{item.content}</p>
                </div>
              </article>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
