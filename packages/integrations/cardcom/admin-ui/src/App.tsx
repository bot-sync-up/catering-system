import React, { useState } from 'react';
import { he } from './locales/he';
import { LogsPage } from './pages/LogsPage';
import { ChargebacksPage } from './pages/ChargebacksPage';
import { RetryPage } from './pages/RetryPage';

type Tab = 'logs' | 'chargebacks' | 'retry';

export function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('logs');
  return (
    <div className="container">
      <h1>{he.appTitle}</h1>
      <div className="tabs">
        <div className={`tab ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>
          {he.tabs.logs}
        </div>
        <div
          className={`tab ${tab === 'chargebacks' ? 'active' : ''}`}
          onClick={() => setTab('chargebacks')}
        >
          {he.tabs.chargebacks}
        </div>
        <div className={`tab ${tab === 'retry' ? 'active' : ''}`} onClick={() => setTab('retry')}>
          {he.tabs.retry}
        </div>
      </div>
      {tab === 'logs' && <LogsPage />}
      {tab === 'chargebacks' && <ChargebacksPage />}
      {tab === 'retry' && <RetryPage />}
    </div>
  );
}
