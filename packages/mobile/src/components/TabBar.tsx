import type { Tab } from '../lib/route.js';
import { navigate } from '../lib/route.js';

export interface TabBarProps {
  active: Tab;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '&#x2302;' },
  { id: 'scrub', label: 'Scrub', icon: '&#x2702;' },
  { id: 'settings', label: 'Settings', icon: '&#x2699;' },
];

export function TabBar({ active }: TabBarProps) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`tab-button ${active === tab.id ? 'tab-button-active' : ''}`}
          onClick={() => {
            if (tab.id === 'home') navigate({ name: 'home' });
            else if (tab.id === 'scrub') navigate({ name: 'scrub', path: '' });
            else if (tab.id === 'settings') navigate({ name: 'settings' });
          }}
          aria-label={tab.label}
        >
          <span className="tab-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tab.icon }} />
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
