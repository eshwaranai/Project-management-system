const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/audit');
const { PROJECT_STATUSES } = require('../utils/validators');

const SORTABLE_FIELDS = new Set(['name', 'status', 'start_date', 'end_date', 'created_at']);

// Fetches a project only if it belongs to the requesting user.
async function getOwnedProject(projectId, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
  return rows[0] || null;
}

const listProjects = asyncHandler(async (req, res) => {
  const { search, status, sortBy = 'created_at', order = 'desc' } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const safeSort = SORTABLE_FIELDS.has(sortBy) ? sortBy : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['user_id = ?'];
  const params = [req.user.id];

  if (search) {
    conditions.push('name LIKE ?');
    params.push(`%${search}%`);
  }
  if (status) {
    if (!PROJECT_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${PROJECT_STATUSES.join(', ')}`);
    }
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT * FROM projects WHERE ${whereClause} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM projects WHERE ${whereClause}`,
    params
  );

  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.params.id, req.user.id);
  if (!project) throw new ApiError(404, 'Project not found');
  res.json(project);
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description, status = 'Not Started', startDate, endDate } = req.body;

  const [result] = await pool.query(
    `INSERT INTO projects (user_id, name, description, status, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, description || null, status, startDate || null, endDate || null]
  );

  const project = await getOwnedProject(result.insertId, req.user.id);
  await recordAudit({ userId: req.user.id, action: 'CREATE', entityType: 'project', entityId: project.id });

  res.status(201).json(project);
});

const updateProject = asyncHandler(async (req, res) => {
  const existing = await getOwnedProject(req.params.id, req.user.id);
  if (!existing) throw new ApiError(404, 'Project not found');

  const { name, description, status, startDate, endDate } = req.body;

  await pool.query(
    `UPDATE projects SET
       name = ?, description = ?, status = ?, start_date = ?, end_date = ?
     WHERE id = ? AND user_id = ?`,
    [
      name ?? existing.name,
      description ?? existing.description,
      status ?? existing.status,
      startDate ?? existing.start_date,
      endDate ?? existing.end_date,
      req.params.id,
      req.user.id
    ]
  );

  const updated = await getOwnedProject(req.params.id, req.user.id);
  await recordAudit({ userId: req.user.id, action: 'UPDATE', entityType: 'project', entityId: updated.id });

  res.json(updated);
});

const deleteProject = asyncHandler(async (req, res) => {
  const existing = await getOwnedProject(req.params.id, req.user.id);
  if (!existing) throw new ApiError(404, 'Project not found');

  // Tasks are removed automatically via ON DELETE CASCADE.
  await pool.query('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  await recordAudit({ userId: req.user.id, action: 'DELETE', entityType: 'project', entityId: Number(req.params.id) });

  res.status(204).send();
});

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject, getOwnedProject };
