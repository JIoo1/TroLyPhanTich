import { Check, CircleDashed } from 'lucide-react';
import type { Progress } from '../types';

const stages = ['BUSINESS_GOAL', 'STAKEHOLDER', 'SCOPE', 'FUNCTIONAL', 'NON_FUNCTIONAL', 'DONE'];
const labels: Record<string, string> = {
  BUSINESS_GOAL: 'Mục tiêu',
  STAKEHOLDER: 'Bên liên quan',
  ACTOR: 'Actor',
  SCOPE: 'Phạm vi',
  FUNCTIONAL: 'Chức năng',
  NON_FUNCTIONAL: 'Phi chức năng',
  DONE: 'Hoàn tất',
};
export function ProgressCard({ progress }: { progress: Progress }) {
  const current = Math.max(0, stages.indexOf(progress.stage));
  return (
    <div className="progress-card">
      <div className="progress-top">
        <div className="progress-symbol">
          <CircleDashed size={16} />
        </div>
        <div>
          <span className="eyebrow">TIẾN ĐỘ KHÁM PHÁ</span>
          <div className="progress-current">{labels[progress.stage] || progress.stage}</div>
        </div>
        <strong>{progress.completion}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${Math.min(100, Math.max(0, progress.completion))}%` }} />
      </div>
      <div className="stage-list">
        {stages.slice(0, 5).map((stage, index) => (
          <div className={`stage ${index <= current ? 'stage-active' : ''}`} key={stage}>
            <span>{index < current ? <Check size={10} /> : index + 1}</span>
            {labels[stage]}
          </div>
        ))}
      </div>
    </div>
  );
}
