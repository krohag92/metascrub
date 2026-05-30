/**
 * WarningBadge — displays metadata privacy warnings in red.
 *
 * Adapted from packages/extension/src/popup/components/WarningBadge.tsx.
 * Keep in sync: if the extension component changes, mirror the logic here.
 */

interface WarningBadgeProps {
  warnings: string[];
  className?: string;
}

export function WarningBadge({ warnings, className = '' }: WarningBadgeProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      role="alert"
      className={`rounded-md bg-red-50 border border-red-200 p-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-700">
            {warnings.length === 1 ? '1 warning' : `${warnings.length} warnings`}
          </p>
          <ul className="mt-1 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-red-600">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
