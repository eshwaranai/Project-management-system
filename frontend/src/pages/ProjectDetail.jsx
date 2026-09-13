import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import ProjectForm from '../components/ProjectForm';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../utils/formatDate';

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High'];
const STRIPE_COLOR = {
  Pending: 'var(--border)',
  'In Progress': 'var(--info)',
  Completed: 'var(--success)'
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectError, setProjectError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const [editingProject, setEditingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadProject = useCallback(async () => {
    setProjectError('');
    try {
      const { data } = await client.get(`/projects/${id}`);
      setProject(data);
    } catch (err) {
      setProjectError(apiErrorMessage(err, 'Unable to load this project.'));
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setTasksError('');
    try {
      const params = { projectId: id, page, limit: 8 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const { data } = await client.get('/tasks', { params });
      setTasks(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setTasksError(apiErrorMessage(err, 'Unable to load tasks for this project.'));
    } finally {
      setLoading(false);
    }
  }, [id, page, search, status, priority]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const handleToggleComplete = async (task) => {
    if (task.status === 'Completed') return;
    setActionError('');
    try {
      await client.patch(`/tasks/${task.id}/complete`);
      loadTasks();
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not update that task.'));
    }
  };

  const handleDeleteProject = async () => {
    try {
      await client.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not delete this project.'));
      setDeletingProject(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      await client.delete(`/tasks/${deletingTask.id}`);
      setDeletingTask(null);
      loadTasks();
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not delete this task.'));
      setDeletingTask(null);
    }
  };

  if (projectError) {
    return (
      <>
        <Link to="/projects" className="back-link">← All projects</Link>
        <ErrorState message={projectError} onRetry={loadProject} />
      </>
    );
  }

  if (!project) return <div className="loading-line">Loading project…</div>;

  return (
    <>
      <Link to="/projects" className="back-link">← All projects</Link>

      {actionError && <div className="form-error-banner">{actionError}</div>}

      <div className="page-head">
        <div>
          <div className="page-eyebrow">Project</div>
          <h1>{project.name}</h1>
          <div className="detail-meta-row">
            <StatusBadge status={project.status} />
            <span className="ledger-meta">Created {formatDate(project.created_at)}</span>
            {project.start_date && <span className="ledger-meta">Starts {formatDate(project.start_date)}</span>}
            {project.end_date && <span className="ledger-meta">Due {formatDate(project.end_date)}</span>}
          </div>
          {project.description && <p className="detail-desc">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setEditingProject(true)}>Edit project</button>
          <button className="btn btn-danger" onClick={() => setDeletingProject(true)}>Delete</button>
        </div>
      </div>

      <div className="page-head" style={{ marginBottom: 16 }}>
        <h2 className="section-heading" style={{ margin: 0 }}>Tasks</h2>
        <button className="btn btn-primary" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
          + New task
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text" placeholder="Search tasks by name…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading && <div className="loading-line">Loading tasks…</div>}

      {!loading && tasksError && <ErrorState message={tasksError} onRetry={loadTasks} />}

      {!loading && !tasksError && tasks.length === 0 && (
        <div className="ledger">
          <div className="empty-state">
            <div className="empty-title">No tasks yet</div>
            <p>Add a task to start tracking work on this project.</p>
          </div>
        </div>
      )}

      {!loading && !tasksError && tasks.length > 0 && (
        <div className="ledger">
          {tasks.map((t) => (
            <div key={t.id} className="ledger-row">
              <div className="ledger-stripe" style={{ background: STRIPE_COLOR[t.status] }} />
              <div className="ledger-main">
                <div className="ledger-title">{t.name}</div>
                {t.description && <div className="ledger-sub">{t.description}</div>}
                <div className="ledger-dates">
                  Created {formatDate(t.created_at) || '·'}
                  {t.due_date && ` · Due ${formatDate(t.due_date)}`}
                </div>
              </div>
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
              <div className="ledger-actions">
                {t.status !== 'Completed' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleComplete(t)}>Mark done</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTask(t); setTaskFormOpen(true); }}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeletingTask(t)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !tasksError && pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {editingProject && (
        <ProjectForm
          project={project}
          onClose={() => setEditingProject(false)}
          onSaved={(updated) => { setProject(updated); setEditingProject(false); }}
        />
      )}

      {deletingProject && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${project.name}" and all of its tasks? This can't be undone.`}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeletingProject(false)}
        />
      )}

      {taskFormOpen && (
        <TaskForm
          projectId={Number(id)}
          task={editingTask}
          onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
          onSaved={() => { setTaskFormOpen(false); setEditingTask(null); loadTasks(); }}
        />
      )}

      {deletingTask && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${deletingTask.name}"? This can't be undone.`}
          onConfirm={handleDeleteTask}
          onCancel={() => setDeletingTask(null)}
        />
      )}
    </>
  );
}
