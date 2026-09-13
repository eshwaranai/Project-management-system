const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules, checkValidation } = require('../utils/validators');

const router = express.Router();

router.post('/register', authLimiter, registerRules, checkValidation, register);
router.post('/login', authLimiter, loginRules, checkValidation, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

module.exports = router;
