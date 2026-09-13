const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/audit');
const { getOwnedProject } = require('./projectController');
const { TASK_PRIORITIES, TASK_STATUSES } = require('../utils/validators');

const SORTABLE_FIELDS = new Set(['name', 'priority', 'status', 'due_date', 'created_at']);

// Joins through the owning project so a task can only be read/modified by its owner.
async function getOwnedTask(taskId, userId) {
  const [rows] = await pool.query(
    `SELECT t.* FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.id = ? AND p.user_id = ?`,
    [taskId, userId]
  );
  return rows[0] || null;
}

const listTasks = asyncHandler(async (req, res) => {
  const { search, status, priority, projectId, sortBy = 'created_at', order = 'desc' } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const safeSort = SORTABLE_FIELDS.has(sortBy) ? sortBy : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['p.user_id = ?'];
  const params = [req.user.id];

  if (projectId) {
    conditions.push('t.project_id = ?');
    params.push(projectId);
  }
  if (search) {
    conditions.push('t.name LIKE ?');
    params.push(`%${search}%`);
  }
  if (status) {
    if (!TASK_STATUSES.includes(status)) throw new ApiError(400, `status must be one of: ${TASK_STATUSES.join(', ')}`);
    conditions.push('t.status = ?');
    params.push(status);
  }
  if (priority) {
    if (!TASK_PRIORITIES.includes(priority)) throw new ApiError(400, `priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
    conditions.push('t.priority = ?');
    params.push(priority);
  }

  const whereClause = conditions.join(' AND ');
  const baseQuery = `FROM tasks t JOIN projects p ON p.id = t.project_id WHERE ${whereClause}`;

  const [rows] = await pool.query(
    `SELECT t.* ${baseQuery} ORDER BY t.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);

  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

const getTask = asyncHandler(async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) throw new ApiError(404, 'Task not found');
  res.json(task);
});

const createTask = asyncHandler(async (req, res) => {
  const { name, description, priority = 'Medium', status = 'Pending', dueDate, projectId } = req.body;

  const project = await getOwnedProject(projectId, req.user.id);
  if (!project) throw new ApiError(404, 'Project not found');

  const [result] = await pool.query(
    `INSERT INTO tasks (project_id, name, description, priority, status, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, name, description || null, priority, status, dueDate || null]
  );

  const task = await getOwnedTask(result.insertId, req.user.id);
  await recordAudit({ userId: req.user.id, action: 'CREATE', entityType: 'task', entityId: task.id });

  res.status(201).json(task);
});

const updateTask = asyncHandler(async (req, res) => {
  const existing = await getOwnedTask(req.params.id, req.user.id);
  if (!existing) throw new ApiError(404, 'Task not found');

  const { name, description, priority, status, dueDate } = req.body;

  await pool.query(
    `UPDATE tasks SET name = ?, description = ?, priority = ?, status = ?, due_date = ? WHERE id = ?`,
    [
      name ?? existing.name,
      description ?? existing.description,
      priority ?? existing.priority,
      status ?? existing.status,
      dueDate ?? existing.due_date,
      req.params.id
    ]
  );

  const updated = await getOwnedTask(req.params.id, req.user.id);
  await recordAudit({ userId: req.user.id, action: 'UPDATE', entityType: 'task', entityId: updated.id });

  res.json(updated);
});

// Shortcut endpoint for marking a task complete without a full update payload.
const completeTask = asyncHandler(async (req, res) => {
  const existing = await getOwnedTask(req.params.id, req.user.id);
  if (!existing) throw new ApiError(404, 'Task not found');

  await pool.query('UPDATE tasks SET status = ? WHERE id = ?', ['Completed', req.params.id]);
  const updated = await getOwnedTask(req.params.id, req.user.id);
  await recordAudit({ userId: req.user.id, action: 'COMPLETE', entityType: 'task', entityId: updated.id });

  res.json(updated);
});

const deleteTask = asyncHandler(async (req, res) => {
  const existing = await getOwnedTask(req.params.id, req.user.id);
  if (!existing) throw new ApiError(404, 'Task not found');

  await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  await recordAudit({ userId: req.user.id, action: 'DELETE', entityType: 'task', entityId: Number(req.params.id) });

  res.status(204).send();
});

module.exports = { listTasks, getTask, createTask, updateTask, completeTask, deleteTask };
