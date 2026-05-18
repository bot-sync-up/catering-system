import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuditLogPage } from './pages/AuditLogPage';

const root = createRoot(document.getElementById('root')!);
root.render(<AuditLogPage />);
