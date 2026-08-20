/**
 * PromptLimitModal — shown when a free-tier user hits the generation cap.
 * Listens for the global 'lr:prompt-limit' event broadcast by the axios
 * interceptor (App.tsx) whenever any generation endpoint returns 402
 * { code: 'prompt_limit_reached' }.
 */

import { useEffect, useState } from 'react';
import { Sparkles, X, Zap } from 'lucide-react';

interface LimitDetail {
  prompts_used?: number;
  prompt_limit?: number;
  error?: string;
}

export function PromptLimitModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<LimitDetail>({});

  useEffect(() => {
    const onLimit = (e: Event) => {
      setDetail((e as CustomEvent).detail || {});
      setOpen(true);
    };
    window.addEventListener('lr:prompt-limit', onLimit);
    return () => window.removeEventListener('lr:prompt-limit', onLimit);
  }, []);

  if (!open) return null;
  const limit = detail.prompt_limit ?? 5;

  return (
    <div className="plimit-overlay" onClick={() => setOpen(false)}>
      <div className="plimit-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="plimit-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
        <div className="plimit-icon"><Sparkles size={26} /></div>
        <h2 className="plimit-title">You've used all {limit} free prompts</h2>
        <p className="plimit-body">
          Your free plan includes {limit} generations — dashboards, infographics, and reports.
          Upgrade to keep building without limits.
        </p>
        <div className="plimit-actions">
          <a className="plimit-btn plimit-btn--primary" href="mailto:kewal@upsynq.com?subject=Upgrade%20my%20LucentReport%20plan">
            <Zap size={15} /> Upgrade my plan
          </a>
          <button className="plimit-btn plimit-btn--ghost" onClick={() => setOpen(false)}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

export default PromptLimitModal;
