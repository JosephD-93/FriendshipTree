import React from 'react';
import ReactDOM from 'react-dom/client';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

async function confirmAppReady() {
  try {
    const result = await CapacitorUpdater.notifyAppReady();
    console.log('[Capgo] notifyAppReady succeeded:', result);
  } catch (error) {
    console.error('[Capgo] notifyAppReady failed:', error);
  }
}

confirmAppReady();