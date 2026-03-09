const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

// Protect all routes
router.use(verifyToken);
router.use(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);

module.exports = router;
