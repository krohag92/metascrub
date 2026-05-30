/**
 * BatchProgress — shows overall batch progress + per-file warning summary table.
 */

import { WarningBadge } from './WarningBadge.js';

export interface BatchFileStatus {
  path: string;
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  warningCount: number;
  errorMessage?: string;
}

interface BatchProgressProps {
  total: number;
  done: number;
  files: BatchFileStatus[];
}

export function BatchProgress({ total, done, files }: BatchProgressProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const errorFiles = files.filter((f) => f.status === 'error');
  const warningFiles = files.filter((f) => f.warningCount > 0 && f.status === 'done');

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Processing…</span>
          <span className="text-xs text-gray-500">
            {done}/{total} ({percent}%)
          </span>
        </div>
        <progress
          value={done}
          max={total}
          className="w-full h-2 rounded-full overflow-hidden appearance-none"
          aria-label={`${percent}% complete`}
          style={{
            accentColor: '#3b82f6',
          }}
        />
      </div>

      {/* Error summary */}
      {errorFiles.length > 0 && (
        <WarningBadge
          warnings={errorFiles.map((f) => `${f.name}: ${f.errorMessage ?? 'Unknown error'}`)}
        />
      )}

      {/* Per-file warning table */}
      {warningFiles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Files with warnings
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left py-1 font-medium">File</th>
                <th className="text-right py-1 font-medium">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {warningFiles.map((f) => (
                <tr key={f.path} className="border-b border-gray-100 last:border-0">
                  <td className="py-1 text-gray-700 truncate max-w-0 pr-2" title={f.path}>
                    {f.name}
                  </td>
                  <td className="py-1 text-right font-medium text-red-500">{f.warningCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File status list */}
      <div className="space-y-1">
        {files.map((f) => (
          <div key={f.path} className="flex items-center gap-2 text-xs">
            <StatusDot status={f.status} />
            <span className="flex-1 truncate text-gray-700" title={f.path}>
              {f.name}
            </span>
            {f.status === 'done' && f.warningCount > 0 && (
              <span className="text-red-400 shrink-0">{f.warningCount} warn</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: BatchFileStatus['status'] }) {
  const colors: Record<BatchFileStatus['status'], string> = {
    pending: 'bg-gray-300',
    processing: 'bg-blue-400 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${colors[status]}`}
      aria-label={status}
    />
  );
}
