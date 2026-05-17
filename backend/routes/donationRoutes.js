import express from 'express';
import {
  createDonation,
  getDonations,
  acceptDonation,
  rejectDonation,
  getAvailableDonations,
  getAllDonations,
  getNearbyDonations,
} from '../controllers/donationController.js';
import { protect, authorizeRoles, authorizeApprovedVolunteer } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', getDonations);
router.get('/all', authorizeRoles('Admin'), getAllDonations);
router.get('/nearby', authorizeRoles('NGO', 'Volunteer', 'Admin'), getNearbyDonations);
router.get('/available', authorizeRoles('NGO', 'Admin', 'Volunteer'), getAvailableDonations);
router.post('/', authorizeRoles('Donor', 'Volunteer'), authorizeApprovedVolunteer, createDonation);
router.put('/:id/accept', authorizeRoles('NGO', 'Admin'), acceptDonation);
router.put('/:id/reject', authorizeRoles('NGO', 'Admin'), rejectDonation);

export default router;
