import React, { useState } from 'react';
import HomePage from './components/HomePage';
import LandingPage from './pages/LandingPage';
import Designer from './pages/Designer';
import WebCall from './pages/WebCall';

const App: React.FC = () => {
  const isWebCall = window.location.pathname === '/call'
  const [view, setView] = useState<'home' | 'dashboard' | 'designer'>('home');
  if (isWebCall) return <WebCall />

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <HomePage />;
      case 'designer':
        return <Designer onDone={() => setView('home')} />;
      default:
        return <LandingPage onEnter={() => setView('dashboard')} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-bg-base text-text-primary font-sans">
      {renderContent()}
    </div>
  );
};

export default App;
