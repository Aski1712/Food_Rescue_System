import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import socketService from '../services/socket.js';
import useGeolocation from '../hooks/useGeolocation.js';

// Custom icon for user location
const userLocationIcon = divIcon({
  html: `<div class="w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: 'user-location-marker',
});

// Custom icon for current user marker
const markerIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Green marker for volunteer
const volunteerIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Blue marker for deliveries
const deliveryIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Red marker for donations
const donationIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Orange marker for expiring donations
const expiringDonationIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const SetMapView = ({ center, zoom = 13 }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Helper function to check if donation is expiring soon
const isExpiringLoon = (expiresAt) => {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffHours = (expiryDate - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 24;
};

// Helper function to check if donation has expired
const hasExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

const formatPhoneHref = (phone) => phone?.replace(/[^+\d]/g, '');

const LiveMap = () => {
  const [position, setPosition] = useState([20, 0]);
  const [deliveries, setDeliveries] = useState([]);
  const [donations, setDonations] = useState([]);
  const [sharing, setSharing] = useState(false);
  const { user, token } = useAuth();
  const { location: userLocation, loading: locationLoading } = useGeolocation();
  useSocket(); // Connect to socket for notifications

  // Initialize user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (location) => {
        setPosition([location.coords.latitude, location.coords.longitude]);
      },
      () => {
        console.warn('Geolocation denied or unavailable');
      }
    );
  }, []);

  // Fetch deliveries and donations
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deliveriesRes, donationsRes] = await Promise.all([
          api.get('/deliveries'),
          api.get('/donations'),
        ]);
        setDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
        setDonations(Array.isArray(donationsRes.data) ? donationsRes.data : []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Socket.io real-time updates for deliveries
  useEffect(() => {
    if (!token) return; // Wait for token

    const socket = socketService.connect(token);

    // Join delivery rooms
    deliveries.forEach((delivery) => {
      if (delivery._id) {
        socket.emit('joinRoom', `delivery-${delivery._id}`);
      }
    });

    // Handlers for real-time updates
    const handleVolunteerUpdate = (data) => {
      const { deliveryId, location, status } = data;
      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery._id === deliveryId
            ? { ...delivery, currentLocation: location, status: status || delivery.status }
            : delivery
        )
      );
    };

    const handleDeliveryUpdate = (data) => {
      const { deliveryId, status, pickupTime, deliveryTime } = data;
      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery._id === deliveryId
            ? { ...delivery, status, pickupTime, deliveryTime }
            : delivery
        )
      );
    };

    // Handle new donations
    const handleNewDonation = (data) => {
      setDonations((prev) => [data, ...prev]);
    };

    // Handle donation status updates
    const handleDonationStatusUpdate = (data) => {
      const { donationId, status } = data;
      setDonations((prev) =>
        prev.map((donation) =>
          donation._id === donationId ? { ...donation, status } : donation
        )
      );
    };

    socket.on('volunteerUpdate', handleVolunteerUpdate);
    socket.on('deliveryUpdate', handleDeliveryUpdate);
    socket.on('newDonation', handleNewDonation);
    socket.on('donationStatusUpdate', handleDonationStatusUpdate);

    return () => {
      socket.off('volunteerUpdate', handleVolunteerUpdate);
      socket.off('deliveryUpdate', handleDeliveryUpdate);
      socket.off('newDonation', handleNewDonation);
      socket.off('donationStatusUpdate', handleDonationStatusUpdate);
    };
  }, [deliveries, token]);

  // Handle volunteer location sharing
  useEffect(() => {
    if (!sharing || !token) return;

    const socket = socketService.connect(token);
    const watchId = navigator.geolocation.watchPosition(
      (location) => {
        const { latitude, longitude } = location.coords;
        setPosition([latitude, longitude]);

        const assignedDelivery = deliveries.find(
          (delivery) => delivery.volunteer?._id === user._id
        );
        if (assignedDelivery) {
          socket.emit('volunteerLocation', {
            deliveryId: assignedDelivery._id,
            location: { type: 'Point', coordinates: [longitude, latitude] },
          });
        }
      },
      () => {
        console.warn('Unable to track location');
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [sharing, deliveries, user._id, token]);

  const handleShare = () => setSharing((current) => !current);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl surface-card p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Live Tracking Map</h2>
            <p className="mt-2 text-slate-600">Real-time view of donations and deliveries. Volunteer locations update automatically with Socket.io.</p>
          </div>
          {user?.role === 'Volunteer' && (
            <button
              onClick={handleShare}
              className={`rounded-2xl px-4 py-3 text-white font-medium transition-colors ${
                sharing
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {sharing ? '📍 Stop sharing location' : '📍 Share my location'}
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm surface-card">
        <MapContainer center={position} zoom={13} className="h-[600px] w-full sm:h-[520px]">
          <SetMapView center={position} zoom={13} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* User location circle for accuracy */}
          {userLocation && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={50}
              pathOptions={{ color: 'blue', fill: false, opacity: 0.3 }}
            />
          )}

          {/* Current user position */}
          <Marker position={position} icon={userLocationIcon}>
            <Popup>
              <div className="text-sm font-medium">
                <strong>Your Location</strong><br />
                Lat: {position[0].toFixed(4)}, Lng: {position[1].toFixed(4)}<br />
                {sharing && <span className="text-green-600 font-bold">📍 Sharing location</span>}
              </div>
            </Popup>
          </Marker>

          {/* Donation markers */}
          {donations.map((donation) => {
            const coords = donation.location?.coordinates;
            if (!coords || !Array.isArray(coords) || coords.length < 2) return null;

            const isExpiring = isExpiringLoon(donation.expiresAt);
            const isExpired = hasExpired(donation.expiresAt);
            const markerIconToUse = isExpired ? markerIcon : isExpiring ? expiringDonationIcon : donationIcon;

            return (
              <Marker
                key={`donation-${donation._id}`}
                position={[coords[1], coords[0]]}
                icon={markerIconToUse}
              >
                <Popup maxWidth={300}>
                  <div className="text-sm space-y-2">
                    <div className="font-bold text-base text-slate-900">{donation.foodType}</div>
                    
                    {/* Donation Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        donation.status === 'available' 
                          ? 'bg-green-100 text-green-700'
                          : donation.status === 'claimed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {donation.status?.toUpperCase() || 'AVAILABLE'}
                      </span>
                      {isExpiring && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">⏰ Expiring soon</span>}
                      {isExpired && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">❌ Expired</span>}
                    </div>

                    {/* Quantity and Unit */}
                    {donation.quantity && (
                      <div className="text-slate-700">
                        <strong>Qty:</strong> {donation.quantity} {donation.unit || 'units'}
                      </div>
                    )}

                    {/* Donor Info */}
                    {donation.donor && (
                      <div className="border-t border-slate-200 pt-2">
                        <strong className="text-slate-900">Donor:</strong>
                        <div className="text-slate-600">{donation.donor.name}</div>
                        <div className="text-slate-600 text-xs">
                          📞{' '}
                          <a
                            href={`tel:${formatPhoneHref(donation.donor.phone)}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {donation.donor.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Expiration Date */}
                    {donation.expiresAt && (
                      <div className="border-t border-slate-200 pt-2">
                        <strong className="text-slate-900">Expires:</strong>
                        <div className="text-slate-600">
                          {new Date(donation.expiresAt).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {donation.description && (
                      <div className="text-slate-600 italic">{donation.description}</div>
                    )}

                    {/* Coordinates */}
                    <div className="text-xs text-slate-500 border-t border-slate-200 pt-2">
                      📍 {coords[1].toFixed(4)}, {coords[0].toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Delivery markers with volunteer locations */}
          {deliveries.map((delivery) => {
            const coords = delivery.currentLocation?.coordinates;
            if (!coords || !Array.isArray(coords) || coords.length < 2) return null;

            const isCurrentUserDelivery = delivery.volunteer?._id === user._id;
            const markerIconToUse = isCurrentUserDelivery ? volunteerIcon : deliveryIcon;

            return (
              <Marker
                key={`delivery-${delivery._id}`}
                position={[coords[1], coords[0]]}
                icon={markerIconToUse}
              >
                <Popup maxWidth={300}>
                  <div className="text-sm space-y-2">
                    <div className="font-bold text-base text-slate-900">
                      Delivery #{delivery._id?.slice(-6) || 'N/A'}
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                      delivery.status === 'Pending' ? 'bg-gray-100 text-gray-700'
                      : delivery.status === 'Accepted' ? 'bg-blue-100 text-blue-700'
                      : delivery.status === 'PickedUp' ? 'bg-yellow-100 text-yellow-700'
                      : delivery.status === 'InTransit' ? 'bg-orange-100 text-orange-700'
                      : delivery.status === 'Delivered' ? 'bg-green-100 text-green-700'
                      : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {delivery.status?.replace(/([A-Z])/g, ' $1').trim() || 'UNKNOWN'}
                    </div>

                    {/* Volunteer Info */}
                    {delivery.volunteer && (
                      <div className="border-t border-slate-200 pt-2">
                        <strong className="text-slate-900">Volunteer:</strong>
                        <div className="text-slate-600">{delivery.volunteer.name}</div>
                        <div className="text-slate-600 text-xs">
                          📞{' '}
                          <a
                            href={`tel:${formatPhoneHref(delivery.volunteer.phone)}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {delivery.volunteer.phone}
                          </a>
                        </div>
                        {isCurrentUserDelivery && <span className="text-green-600 text-xs font-bold">✓ Your delivery</span>}
                      </div>
                    )}

                    {/* Donation Details */}
                    {delivery.donation?.donor && (
                      <div className="border-t border-slate-200 pt-2">
                        <strong className="text-slate-900">Donor:</strong>
                        <div className="text-slate-600">{delivery.donation.donor.name}</div>
                        <div className="text-slate-600 text-xs">
                          📞{' '}
                          <a
                            href={`tel:${formatPhoneHref(delivery.donation.donor.phone)}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {delivery.donation.donor.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Recipient Info */}
                    {delivery.recipient && (
                      <div className="border-t border-slate-200 pt-2">
                        <strong className="text-slate-900">Recipient (NGO):</strong>
                        <div className="text-slate-600">{delivery.recipient.name}</div>
                      </div>
                    )}

                    {/* Timestamps */}
                    {delivery.pickupTime && (
                      <div className="text-xs text-slate-600">
                        ✓ Picked up: {new Date(delivery.pickupTime).toLocaleTimeString()}
                      </div>
                    )}
                    {delivery.deliveryTime && (
                      <div className="text-xs text-slate-600">
                        ✓ Delivered: {new Date(delivery.deliveryTime).toLocaleTimeString()}
                      </div>
                    )}

                    {/* Coordinates */}
                    <div className="text-xs text-slate-500 border-t border-slate-200 pt-2">
                      📍 {coords[1].toFixed(4)}, {coords[0].toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl surface-card p-6 shadow-soft border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">🎯 Donation Legend</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <LegendRow color="bg-red-400" label="Available - Ready for pickup" />
            <LegendRow color="bg-orange-400" label="Expiring Soon - Within 24 hours" />
            <LegendRow color="bg-slate-400" label="Expired - No longer available" />
          </div>
        </div>

        <div className="rounded-3xl surface-card p-6 shadow-soft border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">🚚 Delivery Legend</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <LegendRow color="bg-slate-400" label="Pending - Awaiting volunteer" />
            <LegendRow color="bg-blue-400" label="Accepted - Volunteer assigned" />
            <LegendRow color="bg-yellow-400" label="Picked Up - Food collected" />
            <LegendRow color="bg-orange-400" label="In Transit - On the way" />
            <LegendRow color="bg-green-400" label="Delivered - Reached destination" />
            <LegendRow color="bg-emerald-400" label="Completed - Finalized" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Active Donations" value={donations.length} tone="red" />
        <MetricCard label="Active Deliveries" value={deliveries.length} tone="blue" />
        <MetricCard label="Location Sharing" value={sharing ? 'Live' : 'Offline'} tone={sharing ? 'green' : 'slate'} />
      </div>

      <div className="rounded-3xl surface-muted border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-2">💡 How it works</h4>
        <p className="text-sm text-slate-600 mb-3">
          This map displays donations and deliveries in real time. Delivery markers update automatically using socket events, and volunteer location sharing helps keep everyone aligned.
        </p>
        <p className="text-sm text-slate-600">
          Donations are shown in red, expiring donations are orange, and active deliveries show whether a volunteer is on the way or completed. Turn on sharing to make your live route visible to the team.
        </p>
      </div>
    </div>
  );
};

const LegendRow = ({ color, label }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 rounded-full ${color}`} />
    <span>{label}</span>
  </div>
);

const MetricCard = ({ label, value, tone }) => {
  const toneStyles = {
    red: 'from-red-50 to-red-100 border-red-200 text-red-700',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    green: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
    slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-700',
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${toneStyles[tone]} p-6 border shadow-sm`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm uppercase tracking-[0.2em] mt-2 font-semibold">{label}</div>
    </div>
  );
};

export default LiveMap;
