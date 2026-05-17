import { useEffect } from 'react';
import { toast } from 'react-toastify';
import socketService from '../services/socket.js';
import { useAuth } from '../context/AuthContext.jsx';

export const useSocket = (role) => {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return; // Don't connect if no token

    const socket = socketService.connect(token);

    // Join role-based room if role is provided
    if (role) {
      socketService.joinRole(role);
    }

    // Event handlers with toast notifications
    const newDonationHandler = (payload) => {
      toast.success(`🍕 New donation available: ${payload.title}`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    };

    const deliveryUpdateHandler = (payload) => {
      toast.info(`🚚 Delivery status updated to ${payload.status}`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    };

    const donationStatusHandler = (payload) => {
      toast.info(`📦 Donation status updated`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    };

    // Register event listeners
    socket.on('newDonation', newDonationHandler);
    socket.on('deliveryUpdate', deliveryUpdateHandler);
    socket.on('donationStatus', donationStatusHandler);

    // Cleanup function
    return () => {
      socket.off('newDonation', newDonationHandler);
      socket.off('deliveryUpdate', deliveryUpdateHandler);
      socket.off('donationStatus', donationStatusHandler);
      // Don't disconnect here as other components might be using the socket
    };
  }, [role, token]);

  return {};
};
