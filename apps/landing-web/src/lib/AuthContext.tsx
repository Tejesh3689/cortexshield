import React, { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS, validateApiKey } from './api';
import { connectWebSocket, disconnectWebSocket } from './ws';

export interface AuthState {
  apiKey: string;
  tenantId: string;
  agentId: string;
  userEmail: string;
  isAuthenticated: boolean;
  signIn: (apiKey: string, email: string, rememberMe: boolean) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.API_KEY) ?? '' : ''
  );
  const [tenantId, setTenantId] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TENANT_ID) ?? '' : ''
  );
  const [agentId, setAgentId] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AGENT_ID) ?? '' : ''
  );
  const [userEmail, setUserEmail] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.EMAIL) ?? '' : ''
  );

  const isAuthenticated = Boolean(apiKey && tenantId);

  useEffect(() => {
    // Listen for 401s from the API wrapper
    const onUnauthorized = () => signOut();
    window.addEventListener('cs:unauthorized', onUnauthorized);
    return () => window.removeEventListener('cs:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, apiKey]); // Reconnect if key changes

  const signIn = async (key: string, email: string, rememberMe: boolean) => {
    // Validate key against proxy-engine health endpoint first
    const isValid = await validateApiKey(key);
    if (!isValid) return false;

    // For hackathon: extract tenant/agent from key if it's our dev key, otherwise use defaults
    // Real implementation would decode JWT or hit a /me endpoint
    const tid = 'test-tenant';
    const aid = 'portal-user';

    setApiKey(key);
    setTenantId(tid);
    setAgentId(aid);
    setUserEmail(email);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key);
      localStorage.setItem(STORAGE_KEYS.TENANT_ID, tid);
      localStorage.setItem(STORAGE_KEYS.AGENT_ID, aid);
      localStorage.setItem(STORAGE_KEYS.EMAIL, email);
      if (!rememberMe) {
        localStorage.setItem('cs-remember', 'false'); // just a flag for UI
      }
    }
    return true;
  };

  const signOut = () => {
    setApiKey('');
    setTenantId('');
    setAgentId('');
    setUserEmail('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      localStorage.removeItem(STORAGE_KEYS.TENANT_ID);
      localStorage.removeItem(STORAGE_KEYS.AGENT_ID);
      localStorage.removeItem(STORAGE_KEYS.EMAIL);
      localStorage.removeItem('cs-remember');
    }
  };

  return (
    <AuthContext.Provider value={{ apiKey, tenantId, agentId, userEmail, isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
