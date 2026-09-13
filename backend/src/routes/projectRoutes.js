const express = require('express');
const {
  listProjects, getProject, createProject, updateProject, deleteProject
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { projectRules, paginationRules, checkValidation } = require('../utils/validators');

const router = express.Router();

router.use(authenticate);

router.get('/', paginationRules, checkValidation, listProjects);
router.get('/:id', getProject);
router.post('/', projectRules, checkValidation, createProject);
router.put('/:id', projectRules, checkValidation, updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
