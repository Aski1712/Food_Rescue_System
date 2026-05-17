import Donation from '../models/Donation.js';
import Delivery from '../models/Delivery.js';
import { getIo } from '../utils/socket.js';

export const createDonation = async (req, res) => {
  const { title, description, quantity, expiryTime, location, address } = req.body;

  const donation = await Donation.create({
    title,
    description,
    quantity,
    expiryTime,
    donor: req.user._id,
    location: { type: 'Point', coordinates: location.coordinates, address },
  });

  // Emit newDonation event to NGO and Volunteer rooms
  getIo().to('NGO').emit('newDonation', donation);
  getIo().to('Volunteer').emit('newDonation', donation);

  res.status(201).json(donation);
};

export const getDonations = async (req, res) => {
  const filter = {};

  if (req.user.role === 'Donor') {
    filter.donor = req.user._id;
  }

  if (req.user.role === 'NGO') {
    filter.status = 'Available';
  }

  const donations = await Donation.find(filter).populate('donor', 'name phone');
  res.json(donations);
};

export const acceptDonation = async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    return res.status(404).json({ message: 'Donation not found' });
  }

  donation.status = 'Accepted';
  donation.ngo = req.user._id;
  await donation.save();

  const delivery = await Delivery.create({
    donation: donation._id,
    status: 'Pending',
    phone: req.user.phone,
  });

  getIo().emit('donationStatus', { donationId: donation._id, status: donation.status });
  res.json({ donation, delivery });
};

export const rejectDonation = async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    return res.status(404).json({ message: 'Donation not found' });
  }
  donation.status = 'Rejected';
  await donation.save();

  getIo().emit('donationStatus', { donationId: donation._id, status: donation.status });
  res.json(donation);
};

export const getAvailableDonations = async (req, res) => {
  const donations = await Donation.find({ status: 'Available' }).populate('donor', 'name phone');
  res.json(donations);
};

export const getAllDonations = async (req, res) => {
  const donations = await Donation.find()
    .populate('donor', 'name email phone')
    .populate('ngo', 'name email phone');
  res.json(donations);
};

export const getNearbyDonations = async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  let coordinates;

  if (lat && lng) {
    coordinates = [Number(lng), Number(lat)];
  } else if (req.user.location?.coordinates?.length === 2) {
    coordinates = req.user.location.coordinates;
  } else {
    return res.status(400).json({ message: 'Location coordinates are required' });
  }

  const donations = await Donation.find({
    status: 'Available',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: Number(radius),
      },
    },
  }).populate('donor', 'name phone');

  res.json(donations);
};
