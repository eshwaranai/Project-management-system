import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import ErrorState from '../components/ErrorState';
import ProjectForm from '../components/ProjectForm';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/dashboard');
      setStats(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load your dashboard right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Overview</div>
          <h1>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>+ New project</button>
          <Link to="/projects" className="btn btn-ghost">View all projects</Link>
        </div>
      </div>

      {loading && <div className="loading-line">Loading your stats…</div>}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && stats && (
        <div className="stat-grid">
          <div className="stat-hero">
            <div className="stat-value">{stats.totalProjects}</div>
            <div className="stat-label">Total projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.projectsInProgress}</div>
            <div className="stat-label">Projects in progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalTasks}</div>
            <div className="stat-label">Total tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completedTasks}</div>
            <div className="stat-label">Completed tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingTasks}</div>
            <div className="stat-label">Pending tasks</div>
          </div>
        </div>
      )}

      {formOpen && (
        <ProjectForm
          onClose={() => setFormOpen(false)}
          onSaved={(project) => { setFormOpen(false); navigate(`/projects/${project.id}`); }}
        />
      )}
    </>
  );
}
