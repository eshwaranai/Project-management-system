import { useState } from 'react';
import Modal from './Modal';
import client, { apiErrorMessage } from '../api/client';

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Pending', 'In Progress', 'Completed'];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Task name is required';
  else if (form.name.trim().length > 150) errors.name = 'Must be under 150 characters';
  return errors;
}

export default function TaskForm({ projectId, task, onClose, onSaved }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState({
    name: task?.name || '',
    description: task?.description || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Pending',
    dueDate: task?.due_date || ''
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
      const payload = { ...form, projectId };
      if (isEdit) {
        const { data } = await client.put(`/tasks/${task.id}`, payload);
        onSaved(data);
      } else {
        const { data } = await client.post('/tasks', payload);
        onSaved(data);
      }
    } catch (err) {
      setServerError(apiErrorMessage(err, 'Could not save task'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit task' : 'New task'} onClose={onClose}>
      {serverError && <div className="form-error-banner">{serverError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Task name</label>
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
        <div className="field-row">
          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={form.status} onChange={handleChange}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="dueDate">Due date</label>
          <input id="dueDate" name="dueDate" type="date" value={form.dueDate || ''} onChange={handleChange} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
