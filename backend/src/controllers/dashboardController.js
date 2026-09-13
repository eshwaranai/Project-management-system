const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [[projectStats]] = await pool.query(
    `SELECT
       COUNT(*) AS totalProjects,
       SUM(status = 'In Progress') AS projectsInProgress
     FROM projects WHERE user_id = ?`,
    [userId]
  );

  const [[taskStats]] = await pool.query(
    `SELECT
       COUNT(*) AS totalTasks,
       SUM(t.status = 'Completed') AS completedTasks,
       SUM(t.status = 'Pending') AS pendingTasks
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.user_id = ?`,
    [userId]
  );

  res.json({
    totalProjects: Number(projectStats.totalProjects) || 0,
    projectsInProgress: Number(projectStats.projectsInProgress) || 0,
    totalTasks: Number(taskStats.totalTasks) || 0,
    completedTasks: Number(taskStats.completedTasks) || 0,
    pendingTasks: Number(taskStats.pendingTasks) || 0
  });
});

module.exports = { getDashboard };
