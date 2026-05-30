/**
 * MetadataGroup — collapsible namespace section for metadata fields.
 * Adapted from packages/extension/src/popup/components/MetadataView.tsx
 * (NamespaceGroup) with mobile-first layout and larger touch targets.
 */
import { useState } from 'react';
import type { MetadataField } from '@metascrub/core';

export interface MetadataGroupProps {
  namespace: string;
  fields: MetadataField[];
  defaultOpen?: boolean;
}

export function MetadataGroup({ namespace, fields, defaultOpen = false }: MetadataGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sensitiveCount = fields.filter((f) => f.sensitive).length;

  return (
    <div className="metadata-group">
      <button
        className="metadata-group-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="metadata-group-title">
          <span className="metadata-group-name">{namespace}</span>
          <span className="metadata-group-count">({fields.length})</span>
        </div>
        <div className="metadata-group-meta">
          {sensitiveCount > 0 && (
            <span className="sensitive-badge">{sensitiveCount} sensitive</span>
          )}
          <span className={`chevron ${open ? 'chevron-open' : ''}`} aria-hidden="true">
            &#8250;
          </span>
        </div>
      </button>

      {open && (
        <div className="metadata-fields">
          {fields.map((field, idx) => (
            <div
              key={`${field.key}-${idx}`}
              className={`metadata-field ${field.sensitive ? 'metadata-field-sensitive' : ''}`}
            >
              <span className="field-label">{field.label ?? field.key}</span>
              <span className="field-value">
                {field.sensitive && (
                  <span className="sensitive-icon" aria-label="sensitive field">
                    &#9888;{' '}
                  </span>
                )}
                {formatFieldValue(field)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFieldValue(field: MetadataField): string {
  if (field.value === null) return '(null)';
  if (typeof field.value === 'boolean') return field.value ? 'Yes' : 'No';
  return String(field.value);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
