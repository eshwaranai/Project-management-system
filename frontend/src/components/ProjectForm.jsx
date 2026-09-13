import { useState } from 'react';
import Modal from './Modal';
import client, { apiErrorMessage } from '../api/client';

const STATUSES = ['Not Started', 'In Progress', 'Completed'];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Project name is required';
  else if (form.name.trim().length > 150) errors.name = 'Must be under 150 characters';

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'End date cannot be before start date';
  }
  return errors;
}

export default function ProjectForm({ project, onClose, onSaved }) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'Not Started',
    startDate: project?.start_date || '',
    endDate: project?.end_date || ''
  });
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
    try {
      if (isEdit) {
        const { data } = await client.put(`/projects/${project.id}`, form);
        onSaved(data);
      } else {
        const { data } = await client.post('/projects', form);
        onSaved(data);
      }
    } catch (err) {
      setServerError(apiErrorMessage(err, 'Could not save project'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit project' : 'New project'} onClose={onClose}>
      {serverError && <div className="form-error-banner">{serverError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Project name</label>
          <input
            id="name" name="name" maxLength={150} value={form.name} onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={form.description} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" value={form.status} onChange={handleChange}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="startDate">Start date</label>
            <input id="startDate" name="startDate" type="date" value={form.startDate || ''} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="endDate">End date</label>
            <input
              id="endDate" name="endDate" type="date" value={form.endDate || ''} onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.endDate)}
            />
            {fieldErrors.endDate && <span className="field-error">{fieldErrors.endDate}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
