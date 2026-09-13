import { useAuth } from '../context/AuthContext';

export default function SessionStatus() {
  const { sessionMinutes } = useAuth();
  if (sessionMinutes == null) return null;

  const urgent = sessionMinutes <= 10;
  const label = sessionMinutes < 1 ? 'less than 1 min' : `${sessionMinutes} min`;

  return (
    <div className={`session-status${urgent ? ' urgent' : ''}`} title="Your session ends automatically when the token expires.">
      <span className="session-dot" />
      Session · {label}
    </div>
  );
}
