// ExportModal.tsx
// Format picker → triggers backend export job → polls status → downloads file.

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BASE } from './constants';
import { X, FileText, Presentation, Image, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface Props {
  dashboardId: number;
  projectId: number;
  title: string;
  palette?: string;
  theme?: string;
  onClose: () => void;
}

type Format = 'pdf' | 'pptx' | 'png';

interface JobState {
  job_id: number;
  status: 'pending' | 'rendering' | 'assembling' | 'done' | 'failed';
  error_msg?: string;
  download_url?: string;
}

const FORMATS: { id: Format; label: string; desc: string; icon: React.ReactNode; ext: string }[] = [
  {
    id: 'pptx',
    label: 'PowerPoint',
    desc: 'Editable slides, one panel per slide. Best for presentations.',
    icon: <Presentation size={22} />,
    ext: '.pptx',
  },
  {
    id: 'pdf',
    label: 'PDF Report',
    desc: 'High-fidelity multi-page document. Best for sharing and printing.',
    icon: <FileText size={22} />,
    ext: '.pdf',
  },
  {
    id: 'png',
    label: 'PNG Poster',
    desc: 'Single stacked image. Best for social media or embedding.',
    icon: <Image size={22} />,
    ext: '.png',
  },
];

const STATUS_LABELS: Record<string, string> = {
  pending:    'Queued…',
  rendering:  'Rendering charts…',
  assembling: 'Assembling file…',
  done:       'Ready to download',
  failed:     'Export failed',
};

const POLL_INTERVAL = 2000; // ms

export default function ExportModal({ dashboardId, projectId, title, palette, theme, onClose }: Props) {
  const [format, setFormat]   = useState<Format>('pptx');
  const [job, setJob]         = useState<JobState | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startExport = async () => {
    setStarting(true);
    try {
      const r = await axios.post(`${BASE}/export/`, {
        dashboard_id: dashboardId,
        project_id:   projectId,
        format,
        title,
        options: { palette, theme },
      });
      const newJob: JobState = { job_id: r.data.job_id, status: r.data.status };
      setJob(newJob);
      pollRef.current = setInterval(() => pollJob(r.data.job_id), POLL_INTERVAL);
    } catch (e: any) {
      setJob({ job_id: 0, status: 'failed', error_msg: e?.response?.data?.error || 'Server error' });
    } finally {
      setStarting(false);
    }
  };

  const pollJob = async (id: number) => {
    try {
      const r = await axios.get(`${BASE}/export/${id}/`);
      setJob(prev => ({ ...prev!, ...r.data }));
      if (r.data.status === 'done' || r.data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch { /* network hiccup — keep polling */ }
  };

  const triggerDownload = () => {
    if (!job?.download_url) return;
    const a = document.createElement('a');
    // Build full URL from backend
    a.href = BASE.replace('/api', '') + job.download_url;
    a.click();
  };

  const isRunning = job && ['pending', 'rendering', 'assembling'].includes(job.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="export-modal-header">
          <div>
            <h2 className="export-modal-title">Export Dashboard</h2>
            <p className="export-modal-sub">Pixel-perfect render via headless Chromium</p>
          </div>
          <button className="export-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        {/* Format picker — only shown before job starts */}
        {!job && (
          <div className="export-format-grid">
            {FORMATS.map(f => (
              <button
                key={f.id}
                className={`export-format-card ${format === f.id ? 'active' : ''}`}
                onClick={() => setFormat(f.id)}
              >
                <div className="export-format-icon">{f.icon}</div>
                <div className="export-format-label">{f.label}</div>
                <div className="export-format-desc">{f.desc}</div>
                <div className="export-format-ext">{f.ext}</div>
              </button>
            ))}
          </div>
        )}

        {/* Progress */}
        {job && (
          <div className="export-progress">
            <div className={`export-status-icon ${job.status}`}>
              {job.status === 'done'   && <CheckCircle size={32} />}
              {job.status === 'failed' && <AlertCircle size={32} />}
              {isRunning               && <Loader2 size={32} className="spin" />}
            </div>
            <div className="export-status-label">{STATUS_LABELS[job.status] || job.status}</div>

            {isRunning && (
              <div className="export-progress-bar">
                <div
                  className="export-progress-fill"
                  style={{
                    width: job.status === 'pending'    ? '15%'
                         : job.status === 'rendering'  ? '55%'
                         : '85%',
                  }}
                />
              </div>
            )}

            {job.status === 'failed' && job.error_msg && (
              <p className="export-error-msg">{job.error_msg.split('\n')[0]}</p>
            )}

            {job.status === 'done' && (
              <button className="export-download-btn" onClick={triggerDownload}>
                <Download size={16}/> Download {FORMATS.find(f => f.id === format)?.label}
              </button>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="export-modal-footer">
          {!job ? (
            <>
              <button className="export-btn-cancel" onClick={onClose}>Cancel</button>
              <button
                className="export-btn-start"
                onClick={startExport}
                disabled={starting}
              >
                {starting ? <Loader2 size={14} className="spin"/> : null}
                {starting ? 'Starting…' : 'Export'}
              </button>
            </>
          ) : job.status === 'done' || job.status === 'failed' ? (
            <button className="export-btn-cancel" onClick={onClose}>Close</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
