const express = require('express');
const router = express.Router();
const { register, login, me, refresh, logout, verifyEmail, resendVerification, forgotPassword, resetPassword, changePassword } = require('../controllers/auth-controller');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, forgotPasswordLimiter, resendVerificationLimiter, changePasswordLimiter } = require('../rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', requireAuth, resendVerificationLimiter, resendVerification);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', forgotPasswordLimiter, resetPassword);
router.put('/change-password', requireAuth, changePasswordLimiter, changePassword);

module.exports = router;
