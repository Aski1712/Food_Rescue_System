import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { donationAPI } from '../api/api.js';
import DonationCard from '../components/DonationCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import useGeolocation from '../hooks/useGeolocation.js'; // Add geolocation hook

const DonationList = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    quantity: '',
    expiryTime: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const { location, loading: locationLoading, error: locationError } = useGeolocation(); // Use geolocation hook

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      setError('');
      try {
        let response;
        if (user.role === 'NGO' || user.role === 'Volunteer') {
          // Fetch nearby donations
          if (location) {
            response = await donationAPI.getNearbyDonations({
              lat: location.lat,
              lng: location.lng,
              radius: 5000, // 5km radius
            });
          } else {
            // Fallback to available donations if location not available
            response = await donationAPI.getAvailableDonations();
          }
        } else {
          // For Donor and Admin, fetch their donations
          response = await donationAPI.getDonations();
        }
        setDonations(response.data);
      } catch (err) {
        setError('Unable to load donations');
        console.error('Donation fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if ((user.role === 'NGO' || user.role === 'Volunteer') && !locationLoading) {
      // Wait for location or fetch fallback
      fetchDonations();
    } else if (user.role === 'Donor' || user.role === 'Admin') {
      // Fetch immediately for other roles
      fetchDonations();
    }
  }, [user, location, locationLoading]);

  // Combine errors
  const combinedError = error || locationError;

  const updateStatus = async (id, action) => {
    try {
      if (action === 'accept') {
        await donationAPI.acceptDonation(id);
      } else if (action === 'reject') {
        await donationAPI.rejectDonation(id);
      }
      // Remove from local state after action
      setDonations((prev) => prev.filter((donation) => donation._id !== id));
    } catch (err) {
      console.error('Status update error:', err);
      setError('Failed to update donation status');
    }
  };

  const canCreateDonation = (user.role === 'Donor' || (user.role === 'Volunteer' && user.status === 'approved'));
  const effectiveCreateLocation = location || (
    createForm.latitude && createForm.longitude
      ? { lat: Number(createForm.latitude), lng: Number(createForm.longitude) }
      : null
  );

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateDonation = async () => {
    setCreateError('');
    if (!createForm.title || !createForm.description || !createForm.quantity || !createForm.expiryTime || !createForm.address) {
      setCreateError('Please complete all donation fields.');
      return;
    }

    if (!effectiveCreateLocation) {
      setCreateError('Location is required. Enable geolocation or enter coordinates manually.');
      return;
    }

    setCreating(true);
    try {
      const response = await donationAPI.createDonation({
        title: createForm.title,
        description: createForm.description,
        quantity: Number(createForm.quantity),
        expiryTime: createForm.expiryTime,
        address: createForm.address,
        location: {
          coordinates: [effectiveCreateLocation.lng, effectiveCreateLocation.lat],
        },
      });
      setDonations((prev) => [response.data, ...prev]);
      setCreateForm({ title: '', description: '', quantity: '', expiryTime: '', address: '', latitude: '', longitude: '' });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Create donation error:', err);
      setCreateError(err.response?.data?.message || 'Unable to create donation.');
    } finally {
      setCreating(false);
    }
  };

  // Combine loading states
  const isLoading = loading || (locationLoading && (user.role === 'NGO' || user.role === 'Volunteer'));

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="w-full space-y-6 md:space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="rounded-2xl md:rounded-3xl surface-card p-6 md:p-8 shadow-soft">        <div className="space-y-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">
                {user.role === 'NGO' || user.role === 'Volunteer' ? '🍕 Nearby Donations' : '📦 My Donations'}
              </h1>
              <p className="text-slate-600 text-sm md:text-base mt-2">
                {user.role === 'NGO' || user.role === 'Volunteer'
                  ? 'Donations available near your location. Accept requests to help distribute food.'
                  : 'View and manage your donations. Track acceptance and delivery progress.'}
              </p>
              {(user.role === 'NGO' || user.role === 'Volunteer') && location && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium border border-primary-200 mt-4">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              )}
            </div>
            {canCreateDonation && (
              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-5 py-3 text-sm md:text-base font-semibold text-white transition hover:bg-primary-700"
              >
                {showCreateForm ? 'Hide donation form' : 'Create a donation'}
              </button>
            )}
          </div>
        </div>
      </div>

      {user.role === 'Volunteer' && user.status !== 'approved' && (
        <div className="rounded-2xl md:rounded-3xl bg-amber-50 border border-amber-200 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 md:w-8 md:h-8 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-amber-800 mb-2">Donation Creation Restricted</h3>
              <p className="text-amber-700 text-sm md:text-base">
                Your volunteer account is pending approval. You can browse nearby donations, but donation creation will be enabled once your account is approved by an administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && canCreateDonation && (
        <div className="rounded-3xl surface-card p-6 md:p-8 shadow-soft border border-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                value={createForm.title}
                onChange={(e) => handleCreateChange('title', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                placeholder="Fresh sandwiches, fruits, etc."
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Quantity</span>
              <input
                type="number"
                min="1"
                value={createForm.quantity}
                onChange={(e) => handleCreateChange('quantity', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                placeholder="Number of portions"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={createForm.description}
                onChange={(e) => handleCreateChange('description', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                placeholder="Share details like contents, packaging, allergies, and best pickup time."
                rows={4}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Expiry Time</span>
              <input
                type="datetime-local"
                value={createForm.expiryTime}
                onChange={(e) => handleCreateChange('expiryTime', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Pickup Address</span>
              <input
                value={createForm.address}
                onChange={(e) => handleCreateChange('address', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                placeholder="123 Main street, City"
              />
            </label>
            {!location && (
              <>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Latitude</span>
                  <input
                    type="number"
                    value={createForm.latitude}
                    onChange={(e) => handleCreateChange('latitude', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    placeholder="Use location or enter manually"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Longitude</span>
                  <input
                    type="number"
                    value={createForm.longitude}
                    onChange={(e) => handleCreateChange('longitude', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    placeholder="Use location or enter manually"
                  />
                </label>
              </>
            )}
          </div>

          {createError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mt-4">
              {createError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {location
                ? 'Location detected automatically from your device.'
                : 'Enter coordinates manually if geolocation is unavailable.'}
            </div>
            <button
              onClick={handleCreateDonation}
              disabled={creating}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-5 py-3 text-sm md:text-base font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? 'Creating donation...' : 'Create donation'}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {combinedError && (
        <div className="flex items-start gap-3 p-4 md:p-5 rounded-xl md:rounded-2xl bg-red-50 border border-red-200 animate-slide-up">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm md:text-base text-red-600 font-medium">{combinedError}</span>
        </div>
      )}

      {/* Donations List */}
      <div className="space-y-4 md:space-y-5">
        {donations.length === 0 ? (
          <div className="rounded-2xl md:rounded-3xl surface-muted p-8 md:p-12 text-center border border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-[var(--surface-muted)] mb-4">
              <span className="text-3xl md:text-4xl">📭</span>
            </div>
            <p className="text-lg md:text-xl font-semibold text-slate-900">No donations yet</p>
            <p className="text-slate-600 text-sm md:text-base mt-2">
              {user.role === 'NGO' || user.role === 'Volunteer'
                ? 'There are no donations available in your area right now. Check back soon!'
                : 'You haven\'t created any donations yet. Create one to get started!'}
            </p>
          </div>
        ) : (
          donations.map((donation) => (
            <DonationCard
              key={donation._id}
              donation={donation}
              onAccept={user.role === 'NGO' || user.role === 'Volunteer' ? () => updateStatus(donation._id, 'accept') : undefined}
              onReject={user.role === 'NGO' || user.role === 'Volunteer' ? () => updateStatus(donation._id, 'reject') : undefined}
              showLocation={user.role === 'NGO' || user.role === 'Volunteer'}
            />
          ))
        )}
      </div>

      {/* Info Section */}
      {donations.length > 0 && (
        <div className="rounded-2xl md:rounded-3xl surface-muted p-6 md:p-8 border border-slate-200">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary-100 flex items-center justify-center">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-semibold text-slate-900">Real-time Updates</h3>
              <p className="mt-2 text-slate-600 text-sm md:text-base">
                All donation data is updated in real-time. Changes made by other users will appear instantly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationList;
