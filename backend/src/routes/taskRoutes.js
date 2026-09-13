const express = require('express');
const {
  listTasks, getTask, createTask, updateTask, completeTask, deleteTask
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { createTaskRules, updateTaskRules, paginationRules, checkValidation } = require('../utils/validators');

const router = express.Router();

router.use(authenticate);

router.get('/', paginationRules, checkValidation, listTasks);
router.get('/:id', getTask);
router.post('/', createTaskRules, checkValidation, createTask);
router.put('/:id', updateTaskRules, checkValidation, updateTask);
router.patch('/:id/complete', completeTask);
router.delete('/:id', deleteTask);

module.exports = router;
