/**
 * Warning component — adapted from packages/extension/src/popup/components/WarningBadge.tsx
 * Extended for mobile (larger tap targets, full-width layout).
 */
interface WarningProps {
  warnings: string[];
}

export function Warning({ warnings }: WarningProps) {
  if (warnings.length === 0) return null;

  return (
    <div role="alert" className="warning-container">
      <div className="warning-icon" aria-hidden="true">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="warning-body">
        <p className="warning-title">
          {warnings.length === 1 ? '1 warning' : `${warnings.length} warnings`}
        </p>
        <ul className="warning-list">
          {warnings.map((w, i) => (
            <li key={i} className="warning-item">
              {w}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
