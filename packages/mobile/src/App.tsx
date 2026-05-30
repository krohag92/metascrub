import { useEffect, useState } from 'react';
import { TabBar } from './components/TabBar.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { FileScreen } from './screens/FileScreen.js';
import { ScrubScreen } from './screens/ScrubScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { currentRoute, routeToTab, parseHash } from './lib/route.js';
import { registerShareHandler } from './lib/share-extension.js';
import type { Route, Tab } from './lib/route.js';

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [activeTab, setActiveTab] = useState<Tab>(routeToTab(currentRoute()));

  // Listen for hash changes (back/forward, navigate() calls)
  useEffect(() => {
    const handleHashChange = () => {
      const r = parseHash(window.location.hash);
      setRoute(r);
      setActiveTab(routeToTab(r));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen for iOS Share Extension / Android Share Intent URLs
  useEffect(() => {
    registerShareHandler((r) => {
      setRoute(r);
      setActiveTab(routeToTab(r));
    });
  }, []);

  // Sync activeTab when route changes
  useEffect(() => {
    setActiveTab(routeToTab(route));
  }, [route]);

  const renderScreen = () => {
    switch (route.name) {
      case 'home':
        return <HomeScreen />;
      case 'file':
        return <FileScreen filePath={route.path} fromShare={route.fromShare} />;
      case 'scrub':
        return <ScrubScreen filePath={route.path} />;
      case 'settings':
        return <SettingsScreen />;
    }
  };

  return (
    <div className="app">
      <div className="screen-container">
        {renderScreen()}
      </div>
      <TabBar active={activeTab} />
    </div>
  );
}
