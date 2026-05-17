import express from 'express';
import { getProfile, listUsers, getDashboardData, getPendingVolunteers, approveVolunteer, rejectVolunteer } from '../controllers/userController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/profile', getProfile);
router.get('/dashboard', getDashboardData);
router.get('/', authorizeRoles('Admin'), listUsers);
router.get('/pending-volunteers', authorizeRoles('Admin'), getPendingVolunteers);
router.put('/:userId/approve', authorizeRoles('Admin'), approveVolunteer);
router.put('/:userId/reject', authorizeRoles('Admin'), rejectVolunteer);

export default router;
