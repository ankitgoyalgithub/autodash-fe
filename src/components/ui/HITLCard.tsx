/**
 * HITLCard — "human in the loop" input card.
 *
 * Renders a clarification request coming back from the backend (select /
 * number / text / compound form) and hands the answer back through
 * `onAnswer(questionId, answer)`. Shared by the Workspace chat, the analysis
 * job pre-flight form and the Agents library.
 */

import { useState } from 'react';
import { Brain, ChevronRight } from 'lucide-react';

export interface HITLField {
  id: string;
  label: string;
  type: 'select' | 'number' | 'text';
  options?: string[];
  default?: string | number;
  hint?: string;
}

export interface HITLRequest {
  id: string;
  question: string;
  type: 'select' | 'number' | 'text' | 'form';
  options?: string[];
  default?: string | number;
  fields?: HITLField[];
  placeholder?: string;
}

const asStr = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

export function HITLCard({ request, onAnswer, projectColor, submitLabel, busy }: {
  request: HITLRequest;
  onAnswer: (questionId: string, answer: any) => void;
  projectColor: string;
  /** Text for the submit button (default "Continue"). */
  submitLabel?: string;
  /** Disables the submit button while a request is in flight. */
  busy?: boolean;
}) {
  const [simpleAnswer, setSimpleAnswer] = useState<string>(
    asStr(request.default) || request.options?.[0] || ''
  );
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    if (request.fields) {
      return Object.fromEntries(
        request.fields.map(f => [f.id, asStr(f.default) || f.options?.[0] || ''])
      );
    }
    return {};
  });

  const handleSubmit = () => {
    if (busy) return;
    if (request.type === 'form') {
      onAnswer(request.id, formValues);
    } else {
      onAnswer(request.id, simpleAnswer);
    }
  };

  return (
    <div className="hitl-card">
      <div className="hitl-header">
        <Brain size={14} className="hitl-brain-icon"/>
        <span className="hitl-label">Input Required</span>
      </div>
      <p className="hitl-question">{request.question}</p>

      {/* Simple select */}
      {request.type === 'select' && request.options && (
        <div className="hitl-options-grid">
          {request.options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`hitl-option ${simpleAnswer === opt ? 'selected' : ''}`}
              style={simpleAnswer === opt ? { borderColor: projectColor, background: projectColor + '18', color: projectColor } : {}}
              onClick={() => setSimpleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Simple number */}
      {request.type === 'number' && (
        <input
          type="number"
          className="hitl-input"
          value={simpleAnswer}
          onChange={e => setSimpleAnswer(e.target.value)}
          placeholder={request.placeholder || 'Enter a number'}
        />
      )}

      {/* Simple text */}
      {request.type === 'text' && (
        <input
          type="text"
          className="hitl-input"
          value={simpleAnswer}
          onChange={e => setSimpleAnswer(e.target.value)}
          placeholder={request.placeholder || 'Type your answer…'}
        />
      )}

      {/* Form (compound fields) */}
      {request.type === 'form' && request.fields && (
        <div className="hitl-form">
          {request.fields.map(field => (
            <div key={field.id} className="hitl-field">
              <label className="hitl-field-label">
                {field.label}
                {field.hint && <span className="hitl-field-hint"> — {field.hint}</span>}
              </label>
              {field.type === 'select' && field.options ? (
                <div className="hitl-options-grid hitl-options-sm">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`hitl-option ${formValues[field.id] === opt ? 'selected' : ''}`}
                      style={formValues[field.id] === opt ? { borderColor: projectColor, background: projectColor + '18', color: projectColor } : {}}
                      onClick={() => setFormValues(prev => ({ ...prev, [field.id]: opt }))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  step={field.type === 'number' ? 'any' : undefined}
                  className="hitl-input"
                  value={formValues[field.id] || ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="hitl-submit-btn"
        style={{ background: projectColor, opacity: busy ? 0.6 : 1 }}
        onClick={handleSubmit}
        disabled={busy}
      >
        {submitLabel || 'Continue'} <ChevronRight size={13}/>
      </button>
    </div>
  );
}
