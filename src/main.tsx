import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { consumeImportFromHash } from './transfer';

// an #import= link merges storage and reloads; mounting in between would read (and clear) the confirmation early
if (!consumeImportFromHash()) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
