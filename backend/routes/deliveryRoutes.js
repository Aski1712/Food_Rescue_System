import express from 'express';
import {
  getDeliveries,
  getAssignedDeliveries,
  acceptDelivery,
  pickupDelivery,
  startTransit,
  updateTracking,
  deliverDelivery,
  completeDelivery,
  getDeliveryHistory,
  updateDeliveryStatus,
} from '../controllers/deliveryController.js';
import { protect, authorizeRoles, authorizeApprovedVolunteer } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// Get deliveries
router.get('/assigned', authorizeRoles('Volunteer'), authorizeApprovedVolunteer, getAssignedDeliveries);
router.get('/', authorizeRoles('Volunteer', 'NGO', 'Admin'), getDeliveries);
router.get('/:id/history', getDeliveryHistory);

// Status transitions
router.put('/:id/accept', authorizeRoles('Volunteer'), authorizeApprovedVolunteer, acceptDelivery);
router.put('/:id/pickup', authorizeRoles('Volunteer'), authorizeApprovedVolunteer, pickupDelivery);
router.put('/:id/start-transit', authorizeRoles('Volunteer'), authorizeApprovedVolunteer, startTransit);
router.put('/:id/deliver', authorizeRoles('Volunteer'), authorizeApprovedVolunteer, deliverDelivery);
router.put('/:id/complete', authorizeRoles('Volunteer'), authorizeApprovedVolunteer, completeDelivery);
router.put('/:id/status', authorizeRoles('Volunteer', 'Admin'), updateDeliveryStatus);

// Location tracking
router.put('/:id/track', authorizeRoles('Volunteer'), updateTracking);

export default router;
