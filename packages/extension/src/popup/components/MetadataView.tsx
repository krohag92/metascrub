import { useState } from 'react';
import type { MetadataResult, MetadataField } from '@metascrub/core';
import { WarningBadge } from './WarningBadge.js';

interface MetadataViewProps {
  result: MetadataResult;
  filename: string;
}

function formatValue(field: MetadataField): string {
  if (field.value === null) return '(null)';
  if (typeof field.value === 'boolean') return field.value ? 'Yes' : 'No';
  return String(field.value);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface NamespaceGroupProps {
  namespace: string;
  fields: MetadataField[];
  defaultOpen?: boolean;
}

function NamespaceGroup({ namespace, fields, defaultOpen = false }: NamespaceGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sensitiveCount = fields.filter((f) => f.sensitive).length;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {namespace}
          <span className="ml-1.5 text-gray-400 font-normal normal-case">({fields.length})</span>
        </span>
        <div className="flex items-center gap-2">
          {sensitiveCount > 0 && (
            <span className="text-xs font-medium text-red-500">{sensitiveCount} sensitive</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="pb-2">
          <table className="w-full text-xs">
            <tbody>
              {fields.map((field, idx) => (
                <tr
                  key={`${field.key}-${idx}`}
                  className={
                    field.sensitive ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }
                >
                  <td className="px-4 py-1 font-medium text-gray-600 w-2/5 align-top break-words">
                    {field.label ?? field.key}
                  </td>
                  <td className="px-4 py-1 text-gray-700 break-words">
                    {field.sensitive && (
                      <span className="inline-block mr-1 text-red-400" aria-label="sensitive">
                        &#x26A0;
                      </span>
                    )}
                    {formatValue(field)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MetadataView({ result, filename }: MetadataViewProps) {
  const namespaces = Object.entries(result.groups);
  const totalFields = namespaces.reduce((sum, [, fields]) => sum + fields.length, 0);

  return (
    <div>
      {/* File summary */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-800 truncate">{filename}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {result.format.toUpperCase()} · {formatBytes(result.sizeBytes)} · {totalFields} fields
        </p>
      </div>

      {/* Warnings */}
      <WarningBadge warnings={result.warnings} />

      {/* Namespace groups */}
      {namespaces.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-400">No metadata found</p>
        </div>
      ) : (
        <div className="mt-2">
          {namespaces.map(([namespace, fields], idx) => (
            <NamespaceGroup
              key={namespace}
              namespace={namespace}
              fields={fields}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
