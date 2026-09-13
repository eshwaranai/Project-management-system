import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/Badges';
import ProjectForm from '../components/ProjectForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../utils/formatDate';

const STATUSES = ['Not Started', 'In Progress', 'Completed'];
const STRIPE_COLOR = {
  'Not Started': 'var(--border)',
  'In Progress': 'var(--info)',
  'Completed': 'var(--success)'
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: 8, sortBy, order };
      if (search) params.search = search;
      if (status) params.status = status;
      const { data } = await client.get('/projects', { params });
      setProjects(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Unable to load projects right now.'));
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, order, search, status]);

  useEffect(() => { load(); }, [load]);

  // Debounce search so we don't fire a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const handleSaved = (project) => {
    const wasCreate = !editing;
    setFormOpen(false);
    setEditing(null);
    if (wasCreate) {
      navigate(`/projects/${project.id}`);
    } else {
      load();
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    try {
      await client.delete(`/projects/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete this project.'));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{pagination.total} total</div>
          <h1>Projects</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          + New project
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text" placeholder="Search projects by name…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={`${sortBy}:${order}`} onChange={(e) => {
          const [sb, o] = e.target.value.split(':');
          setSortBy(sb); setOrder(o); setPage(1);
        }}>
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="start_date:asc">Start date, earliest</option>
          <option value="end_date:asc">Due date, soonest</option>
        </select>
      </div>

      {loading && <div className="loading-line">Loading projects…</div>}

      {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}

      {!loading && !loadError && projects.length === 0 && (
        <div className="ledger">
          <div className="empty-state">
            <div className="empty-title">No projects yet</div>
            <p>Create your first project to start tracking tasks against it.</p>
          </div>
        </div>
      )}

      {!loading && !loadError && projects.length > 0 && (
        <div className="ledger">
          {projects.map((p) => (
            <div key={p.id} className="ledger-row project-row">
              <div className="ledger-stripe" style={{ background: STRIPE_COLOR[p.status] }} />
              <Link to={`/projects/${p.id}`} className="ledger-main" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="ledger-title">{p.name}</div>
                {p.description && <div className="ledger-sub">{p.description}</div>}
                <div className="ledger-dates">
                  <span>Created {formatDate(p.created_at) || '·'}</span>
                  {p.start_date && <span> · Starts {formatDate(p.start_date)}</span>}
                  {p.end_date && <span> · Due {formatDate(p.end_date)}</span>}
                </div>
              </Link>
              <StatusBadge status={p.status} />
              <div className="ledger-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(p); setFormOpen(true); }}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setDeleting(p); setDeleteError(''); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !loadError && pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {formOpen && (
        <ProjectForm
          project={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete project"
          message={deleteError || `Delete "${deleting.name}" and all of its tasks? This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => { setDeleting(null); setDeleteError(''); }}
        />
      )}
    </>
  );
}
