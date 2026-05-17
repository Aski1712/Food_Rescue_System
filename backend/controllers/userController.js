import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Delivery from '../models/Delivery.js';

export const getProfile = (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const baseCounts = {
      totalDonations: await Donation.countDocuments(),
      totalDeliveries: await Delivery.countDocuments(),
      availableDonations: await Donation.countDocuments({ status: 'Available' }),
    };

    let roleCounts = {};

    if (req.user.role === 'Donor') {
      roleCounts = {
        myDonations: await Donation.countDocuments({ donor: req.user._id }),
        activeDonations: await Donation.countDocuments({ donor: req.user._id, status: 'Available' }),
      };
    }

    if (req.user.role === 'NGO') {
      roleCounts = {
        availableDonations: await Donation.countDocuments({ status: 'Available' }),
        acceptedDonations: await Donation.countDocuments({ ngo: req.user._id, status: 'Accepted' }),
      };
    }

    if (req.user.role === 'Volunteer') {
      roleCounts = {
        assignedDeliveries: await Delivery.countDocuments({ volunteer: req.user._id }),
        inProgressDeliveries: await Delivery.countDocuments({ volunteer: req.user._id, status: { $in: ['Accepted', 'InTransit'] } }),
      };
    }

    if (req.user.role === 'Admin') {
      roleCounts = {
        totalUsers: await User.countDocuments(),
        donors: await User.countDocuments({ role: 'Donor' }),
        ngos: await User.countDocuments({ role: 'NGO' }),
        volunteers: await User.countDocuments({ role: 'Volunteer' }),
      };
    }

    res.json({ ...baseCounts, ...roleCounts });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
};

export const getPendingVolunteers = async (req, res) => {
  try {
    const pendingVolunteers = await User.find({ role: 'Volunteer', status: 'pending' }).select('-password');
    res.json(pendingVolunteers);
  } catch (error) {
    console.error('Pending volunteers fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch pending volunteers' });
  }
};

export const approveVolunteer = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.role !== 'Volunteer' || user.status !== 'pending') {
      return res.status(404).json({ message: 'Pending volunteer not found' });
    }
    user.status = 'approved';
    await user.save();
    res.json({ message: 'Volunteer approved successfully' });
  } catch (error) {
    console.error('Volunteer approval error:', error);
    res.status(500).json({ message: 'Failed to approve volunteer' });
  }
};

export const rejectVolunteer = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.role !== 'Volunteer' || user.status !== 'pending') {
      return res.status(404).json({ message: 'Pending volunteer not found' });
    }
    user.status = 'rejected';
    await user.save();
    res.json({ message: 'Volunteer rejected successfully' });
  } catch (error) {
    console.error('Volunteer rejection error:', error);
    res.status(500).json({ message: 'Failed to reject volunteer' });
  }
};
