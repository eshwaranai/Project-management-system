const { body, query, validationResult } = require('express-validator');
const { ApiError } = require('../middleware/errorHandler');

// Run after any validator chain; turns express-validator's error
// array into a single 400 with a readable list of field messages.
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return next(new ApiError(400, message));
  }
  next();
}

const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High'];
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

const projectRules = [
  body('name').trim().notEmpty().withMessage('Project name is required')
    .isLength({ max: 150 }).withMessage('Project name must be under 150 characters'),
  body('description').optional({ checkFalsy: true }).isString(),
  body('status').optional().isIn(PROJECT_STATUSES).withMessage(`Status must be one of: ${PROJECT_STATUSES.join(', ')}`),
  body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ checkFalsy: true }).isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.startDate && value < req.body.startDate) {
        throw new Error('End date cannot be before start date');
      }
      return true;
    })
];

// Shared rules for create/update. projectId is validated separately below
// since it's required on create but not accepted on update.
const taskCommonRules = [
  body('name').trim().notEmpty().withMessage('Task name is required')
    .isLength({ max: 150 }).withMessage('Task name must be under 150 characters'),
  body('description').optional({ checkFalsy: true }).isString(),
  body('priority').optional().isIn(TASK_PRIORITIES).withMessage(`Priority must be one of: ${TASK_PRIORITIES.join(', ')}`),
  body('status').optional().isIn(TASK_STATUSES).withMessage(`Status must be one of: ${TASK_STATUSES.join(', ')}`),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('Due date must be a valid date')
];

const createTaskRules = [
  ...taskCommonRules,
  body('projectId').isInt({ min: 1 }).withMessage('A valid projectId is required')
];

const updateTaskRules = [
  ...taskCommonRules,
  body('projectId').optional().isInt({ min: 1 }).withMessage('projectId must be a valid integer')
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
];

module.exports = {
  checkValidation,
  registerRules,
  loginRules,
  projectRules,
  createTaskRules,
  updateTaskRules,
  paginationRules,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES
};
