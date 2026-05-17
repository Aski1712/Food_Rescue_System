import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('foodRescueToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('foodRescueToken');
      localStorage.removeItem('foodRescueUser');
      delete api.defaults.headers.common['Authorization'];
      
      // Redirect to login only if not already on login/register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API service functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  getDashboard: () => api.get('/users/dashboard'),
  listUsers: () => api.get('/users'),
};

export const donationAPI = {
  getDonations: () => api.get('/donations'),
  getAllDonations: () => api.get('/donations/all'),
  getNearbyDonations: (params) => api.get('/donations/nearby', { params }),
  getAvailableDonations: () => api.get('/donations/available'),
  createDonation: (data) => api.post('/donations', data),
  acceptDonation: (id) => api.put(`/donations/${id}/accept`),
  rejectDonation: (id) => api.put(`/donations/${id}/reject`),
};

export const deliveryAPI = {
  getDeliveries: () => api.get('/deliveries'),
  getAssignedDeliveries: () => api.get('/deliveries/assigned'),
  acceptDelivery: (id) => api.put(`/deliveries/${id}/accept`),
  pickupDelivery: (id) => api.put(`/deliveries/${id}/pickup`),
  startTransit: (id) => api.put(`/deliveries/${id}/start-transit`),
  deliverDelivery: (id) => api.put(`/deliveries/${id}/deliver`),
  completeDelivery: (id) => api.put(`/deliveries/${id}/complete`),
  updateTracking: (id, data) => api.put(`/deliveries/${id}/track`, data),
  updateDeliveryStatus: (id, status) => api.put(`/deliveries/${id}/status`, { status }),
};

export default api;

