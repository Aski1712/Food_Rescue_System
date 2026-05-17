import { useEffect, useState } from 'react';
import { donationAPI } from '../api/api.js'; // Import donation API service
import DonationCard from '../components/DonationCard.jsx'; // Component to display donation details
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Loading indicator
import useGeolocation from '../hooks/useGeolocation.js'; // Custom geolocation hook
import { useSocket } from '../hooks/useSocket.js'; // Socket hook for real-time updates

const NearbyDonations = () => {
  const [donations, setDonations] = useState([]); // State for nearby donations
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(''); // Error state
  const { location, loading: locationLoading, error: locationError } = useGeolocation(); // Use geolocation hook
  const { } = useSocket('NGO'); // Connect to socket for NGO role (toast notifications handled in hook)

  // Fetch nearby donations when location is available
  useEffect(() => {
    if (location) {
      const fetchNearbyDonations = async () => {
        try {
          setLoading(true);
          setError('');
          // Call API with lat, lng, and radius (5km)
          const response = await donationAPI.getNearbyDonations({
            lat: location.lat,
            lng: location.lng,
            radius: 5000, // 5km radius
          });
          setDonations(response.data);
        } catch (err) {
          setError('Failed to load nearby donations. Please try again.');
          console.error('Nearby donations fetch error:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchNearbyDonations();
    } else if (!locationLoading) {
      // If location loading is done but no location, stop loading
      setLoading(false);
    }
  }, [location, locationLoading]);

  // Combine loading states and errors
  const isLoading = loading || locationLoading;
  const combinedError = error || locationError;

  // Show loading spinner while fetching data
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl surface-card p-6 shadow-sm border border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Nearby Donations</h2"}]}
        <p className="mt-2 text-slate-600">
          Donations available near your current location. Help reduce food waste by accepting requests.
        </p>
        {location && (
          <p className="mt-2 text-sm text-slate-500">
            Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Error message */}
      {combinedError && (
        <div className="rounded-xl bg-red-100 px-4 py-3 text-red-700">
          {combinedError}
        </div>
      )}

      {/* Donations grid */}
      <div className="grid gap-5">
        {donations.length === 0 ? (
          <div className="rounded-3xl surface-muted p-8 text-center">
            <p className="text-slate-600">No donations found nearby.</p>
            <p className="mt-2 text-sm text-slate-500">
              Try refreshing or check if location services are enabled.
            </p>
          </div>
        ) : (
          donations.map((donation) => (
            <DonationCard
              key={donation._id}
              donation={donation}
              showLocation={true} // Show location details
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NearbyDonations;