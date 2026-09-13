import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import client, { apiErrorMessage } from '../api/client';

const AuthContext = createContext(null);

function readTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number(payload.exp) * 1000;
  } catch {
    return 0;
  }
}

function clearSession() {
  localStorage.removeItem('pms_token');
  localStorage.removeItem('pms_user');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pms_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [sessionExpiresAt, setSessionExpiresAt] = useState(() => {
    const token = localStorage.getItem('pms_token');
    const exp = token ? readTokenExpiry(token) : 0;
    return exp > Date.now() ? exp : null;
  });
  const expiryTimer = useRef(null);
  const ticker = useRef(null);

  const endExpiredSession = useCallback(() => {
    clearSession();
    setUser(null);
    setSessionExpiresAt(null);
    sessionStorage.setItem('pms_session_expired', '1');
    if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
  }, []);

  const scheduleSessionExpiry = useCallback((token) => {
    const expiresAt = readTokenExpiry(token);
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (ticker.current) clearInterval(ticker.current);

    if (!expiresAt || expiresAt <= Date.now()) {
      endExpiredSession();
      return;
    }

    setSessionExpiresAt(expiresAt);
    expiryTimer.current = setTimeout(endExpiredSession, Math.max(0, expiresAt - Date.now()));
    ticker.current = setInterval(() => {
      if (Date.now() >= expiresAt) endExpiredSession();
      else setSessionExpiresAt(expiresAt);
    }, 30000);
  }, [endExpiredSession]);

  useEffect(() => {
    const token = localStorage.getItem('pms_token');
    if (token) scheduleSessionExpiry(token);
    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      if (ticker.current) clearInterval(ticker.current);
    };
  }, [scheduleSessionExpiry]);

  const persistSession = (token, nextUser) => {
    localStorage.setItem('pms_token', token);
    localStorage.setItem('pms_user', JSON.stringify(nextUser));
    setUser(nextUser);
    scheduleSessionExpiry(token);
  };

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await client.post('/auth/login', { email, password });
      persistSession(data.token, data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, 'Could not log in') };
    }
  }, [scheduleSessionExpiry]);

  const register = useCallback(async (fullName, email, password) => {
    try {
      const { data } = await client.post('/auth/register', { fullName, email, password });
      persistSession(data.token, data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, 'Could not create account') };
    }
  }, [scheduleSessionExpiry]);

  const logout = useCallback(async () => {
    try { await client.post('/auth/logout'); } catch { /* local session is still cleared */ }
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (ticker.current) clearInterval(ticker.current);
    clearSession();
    setSessionExpiresAt(null);
    setUser(null);
  }, []);

  const sessionMinutes = sessionExpiresAt ? Math.max(0, Math.ceil((sessionExpiresAt - Date.now()) / 60000)) : null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, sessionExpiresAt, sessionMinutes }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
