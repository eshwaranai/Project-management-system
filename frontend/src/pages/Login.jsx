import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function validate(form) {
  const errors = {};
  if (!form.email.trim()) errors.email = 'Email is required';
  if (!form.password) errors.password = 'Password is required';
  return errors;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const result = await login(form.email.trim(), form.password);
    setSubmitting(false);
    if (result.ok) navigate('/');
    else setServerError(result.error);
  };

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="brand">Ledger</div>
          <div className="brand-sub">Project Management</div>
        </div>
        <div className="form-card" style={{ maxWidth: 'none' }}>
          <h2 className="section-heading">Log in</h2>
          {serverError && <div className="form-error-banner">{serverError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password" autoComplete="current-password"
                value={form.password} onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {submitting && <span className="btn-spinner" aria-hidden="true" />}
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>
        <div className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
