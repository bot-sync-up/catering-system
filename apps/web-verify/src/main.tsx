import React from 'react';
import { createRoot } from 'react-dom/client';
import { VerifyApp } from './pages/VerifyApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VerifyApp />
  </React.StrictMode>,
);
