import Delivery from '../models/Delivery.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { getIo } from '../utils/socket.js';

// Helper function to add status history entry
const addStatusHistory = (delivery, newStatus, userId, notes = '') => {
  delivery.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: userId,
    notes,
    location: delivery.currentLocation,
  });
};

// Broadcast delivery update to all relevant parties
const broadcastDeliveryUpdate = (io, delivery, eventType = 'deliveryUpdate') => {
  const volunteerId = delivery.volunteer?._id?.toString() || delivery.volunteer?.toString();
  const recipientId = delivery.recipient?._id?.toString() || delivery.recipient?.toString();

  io.to(`delivery-${delivery._id}`).emit(eventType, {
    deliveryId: delivery._id,
    status: delivery.status,
    statusHistory: delivery.statusHistory,
    pickupTime: delivery.pickupTime,
    deliveryTime: delivery.deliveryTime,
    completionTime: delivery.completionTime,
    currentLocation: delivery.currentLocation,
    updatedAt: delivery.updatedAt,
  });

  // Also broadcast to volunteer and recipient if they exist
  if (volunteerId) {
    io.to(`user-${volunteerId}`).emit('myDeliveryUpdate', {
      deliveryId: delivery._id,
      status: delivery.status,
      statusHistory: delivery.statusHistory,
    });
  }

  if (recipientId) {
    io.to(`user-${recipientId}`).emit('deliveryStatusUpdate', {
      deliveryId: delivery._id,
      status: delivery.status,
    });
  }
};

export const getDeliveries = async (req, res) => {
  const filter = {};
  if (req.user.role === 'Volunteer') {
    filter.volunteer = req.user._id;
  }

  const deliveries = await Delivery.find(filter)
    .populate({ path: 'donation', populate: [
      { path: 'donor', select: 'name phone' },
      { path: 'ngo', select: 'name' }
    ] })
    .populate('volunteer', 'name phone')
    .populate('recipient', 'name phone')
    .sort({ createdAt: -1 });
  res.json(deliveries);
};

export const acceptDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate({ path: 'donation', populate: [{ path: 'donor', select: 'name phone' }] })
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status !== 'Pending') {
      return res.status(400).json({ message: 'Delivery is not available for acceptance' });
    }

    delivery.volunteer = req.user._id;
    delivery.status = 'Accepted';
    addStatusHistory(delivery, 'Accepted', req.user._id, 'Volunteer accepted the delivery');
    await delivery.save();

    const io = getIo();
    broadcastDeliveryUpdate(io, delivery, 'deliveryAccepted');
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pickupDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate({ path: 'donation', populate: [{ path: 'donor', select: 'name phone' }] })
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this delivery' });
    }

    if (delivery.status !== 'Accepted') {
      return res.status(400).json({ message: 'Delivery must be accepted before pickup' });
    }

    delivery.status = 'PickedUp';
    delivery.pickupTime = new Date();
    addStatusHistory(delivery, 'PickedUp', req.user._id, 'Food picked up from donor');
    await delivery.save();

    const io = getIo();
    broadcastDeliveryUpdate(io, delivery, 'deliveryPickedUp');
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const startTransit = async (req, res) => {
  try {
    const { estimatedDeliveryTime, distance, duration } = req.body;
    const delivery = await Delivery.findById(req.params.id)
      .populate({ path: 'donation', populate: [{ path: 'donor', select: 'name phone' }] })
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this delivery' });
    }

    if (delivery.status !== 'PickedUp') {
      return res.status(400).json({ message: 'Delivery must be picked up before starting transit' });
    }

    delivery.status = 'InTransit';
    if (estimatedDeliveryTime) delivery.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    if (distance) delivery.distance = distance;
    if (duration) delivery.duration = duration;
    addStatusHistory(delivery, 'InTransit', req.user._id, 'Delivery in transit to recipient');
    await delivery.save();

    const io = getIo();
    broadcastDeliveryUpdate(io, delivery, 'deliveryInTransit');
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deliverDelivery = async (req, res) => {
  try {
    const { deliveryNotes } = req.body;
    const delivery = await Delivery.findById(req.params.id)
      .populate({ path: 'donation', populate: [{ path: 'donor', select: 'name phone' }] })
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this delivery' });
    }

    if (delivery.status !== 'InTransit') {
      return res.status(400).json({ message: 'Delivery must be in transit before delivery' });
    }

    delivery.status = 'Delivered';
    delivery.deliveryTime = new Date();
    if (deliveryNotes) delivery.deliveryNotes = deliveryNotes;
    addStatusHistory(delivery, 'Delivered', req.user._id, 'Food delivered to recipient');
    await delivery.save();

    const io = getIo();
    broadcastDeliveryUpdate(io, delivery, 'deliveryDelivered');
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate({ path: 'donation', populate: [{ path: 'donor', select: 'name phone' }] })
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this delivery' });
    }

    if (delivery.status !== 'Delivered') {
      return res.status(400).json({ message: 'Delivery must be delivered before completion' });
    }

    delivery.status = 'Completed';
    delivery.completionTime = new Date();
    addStatusHistory(delivery, 'Completed', req.user._id, 'Delivery completed and confirmed');
    await delivery.save();

    const io = getIo();
    broadcastDeliveryUpdate(io, delivery, 'deliveryCompleted');
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTracking = async (req, res) => {
  try {
    const { coordinates } = req.body;
    const delivery = await Delivery.findById(req.params.id)
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this delivery' });
    }

    if (!['PickedUp', 'InTransit'].includes(delivery.status)) {
      return res.status(400).json({ message: 'Cannot track location in current delivery status' });
    }

    delivery.currentLocation = { type: 'Point', coordinates };
    
    // Auto-transition to InTransit if picked up
    if (delivery.status === 'PickedUp') {
      delivery.status = 'InTransit';
      addStatusHistory(delivery, 'InTransit', req.user._id, 'Automatically transitioned to InTransit');
    }
    
    await delivery.save();

    const io = getIo();
    io.to(`delivery-${delivery._id}`).emit('volunteerLocation', {
      deliveryId: delivery._id,
      location: delivery.currentLocation,
      status: delivery.status,
      updatedAt: new Date(),
    });
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDeliveryHistory = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('statusHistory.updatedBy', 'name email');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    res.json({
      deliveryId: delivery._id,
      status: delivery.status,
      statusHistory: delivery.statusHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssignedDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ volunteer: req.user._id })
      .populate({ path: 'donation', populate: [
        { path: 'donor', select: 'name phone' },
        { path: 'ngo', select: 'name' }
      ] })
      .populate('volunteer', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'PickedUp', 'InTransit', 'Delivered', 'Completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const delivery = await Delivery.findById(req.params.id)
      .populate({ path: 'donation', populate: [{ path: 'donor', select: 'name phone' }] })
      .populate('volunteer', 'name phone');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Validate status transition
    const statusTransitions = {
      'Pending': ['Accepted'],
      'Accepted': ['PickedUp'],
      'PickedUp': ['InTransit'],
      'InTransit': ['Delivered'],
      'Delivered': ['Completed'],
      'Completed': [],
    };

    if (!statusTransitions[delivery.status] || !statusTransitions[delivery.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from ${delivery.status} to ${status}` 
      });
    }

    delivery.status = status;
    
    // Update timestamps based on status
    if (status === 'PickedUp') {
      delivery.pickupTime = new Date();
    } else if (status === 'Delivered') {
      delivery.deliveryTime = new Date();
    } else if (status === 'Completed') {
      delivery.completionTime = new Date();
    }

    addStatusHistory(delivery, status, req.user._id, notes || '');
    await delivery.save();

    const io = getIo();
    broadcastDeliveryUpdate(io, delivery, 'deliveryStatusChanged');
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

