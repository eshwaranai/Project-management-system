import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Full name is required';

  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';

  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Must be at least 8 characters';

  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
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
    const result = await register(form.fullName.trim(), form.email.trim(), form.password);
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
          <h2 className="section-heading">Create an account</h2>
          {serverError && <div className="form-error-banner">{serverError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName" name="fullName" type="text" autoComplete="name"
                value={form.fullName} onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>
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
                id="password" name="password" type="password" autoComplete="new-password"
                value={form.password} onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password
                ? <span className="field-error">{fieldErrors.password}</span>
                : <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>At least 8 characters</span>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {submitting && <span className="btn-spinner" aria-hidden="true" />}
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
