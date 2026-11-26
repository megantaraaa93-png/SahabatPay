import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { A11yProvider } from './context/A11yContext';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { VoiceTransactionProvider } from './context/VoiceTransactionContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <A11yProvider>
        <AuthProvider>
          <WalletProvider>
            <VoiceTransactionProvider>
              <App />
            </VoiceTransactionProvider>
          </WalletProvider>
        </AuthProvider>
      </A11yProvider>
    </BrowserRouter>
  </React.StrictMode>
);
