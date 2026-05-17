import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import socketService from '../services/socket.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import api from '../api/api.js';

const DeliveryList = () => {
  const { user, token } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDeliveryId, setExpandedDeliveryId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  useSocket(user?.role === 'Volunteer' ? 'Volunteer' : undefined);

  if (user?.role === 'Volunteer' && user.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl surface-card border border-amber-200 p-8 text-center">
            <h2 className="text-xl font-bold text-amber-800 mb-2">Account Pending Approval</h2>
            <p className="text-amber-700">
              Your volunteer account is currently pending approval by an administrator. You will be able to access delivery features once approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/deliveries/assigned');
        setDeliveries(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Unable to load deliveries. Please try again.');
        console.error('Delivery fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'Volunteer') {
      fetchDeliveries();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;

    const socket = socketService.connect(token);

    const updateDelivery = (data) => {
      const { deliveryId, status, statusHistory, currentLocation } = data;
      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery._id === deliveryId
            ? { ...delivery, status, statusHistory, currentLocation: currentLocation || delivery.currentLocation }
            : delivery
        )
      );
    };

    socket.on('deliveryUpdate', updateDelivery);
    socket.on('deliveryAccepted', updateDelivery);
    socket.on('deliveryPickedUp', updateDelivery);
    socket.on('deliveryInTransit', updateDelivery);
    socket.on('deliveryDelivered', updateDelivery);
    socket.on('deliveryCompleted', updateDelivery);
    socket.on('myDeliveryUpdate', updateDelivery);

    return () => {
      socket.off('deliveryUpdate', updateDelivery);
      socket.off('deliveryAccepted', updateDelivery);
      socket.off('deliveryPickedUp', updateDelivery);
      socket.off('deliveryInTransit', updateDelivery);
      socket.off('deliveryDelivered', updateDelivery);
      socket.off('deliveryCompleted', updateDelivery);
      socket.off('myDeliveryUpdate', updateDelivery);
    };
  }, [token]);

  const updateStatus = useCallback(async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      const endpoints = {
        pickup: `/deliveries/${id}/pickup`,
        'start-transit': `/deliveries/${id}/start-transit`,
        deliver: `/deliveries/${id}/deliver`,
        complete: `/deliveries/${id}/complete`,
      };

      const endpoint = endpoints[action];
      if (!endpoint) throw new Error('Invalid action');

      const response = await api.put(endpoint);
      setDeliveries((prev) => prev.map((delivery) => (delivery._id === id ? response.data : delivery)));
      setError('');
    } catch (err) {
      console.error('Status update error:', err);
      setError(err.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-slate-100 text-slate-700',
      Accepted: 'bg-blue-100 text-blue-700',
      PickedUp: 'bg-amber-100 text-amber-700',
      InTransit: 'bg-orange-100 text-orange-700',
      Delivered: 'bg-emerald-100 text-emerald-700',
      Completed: 'bg-emerald-200 text-emerald-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getProgressPercentage = (status) => {
    const statuses = ['Pending', 'Accepted', 'PickedUp', 'InTransit', 'Delivered', 'Completed'];
    const index = statuses.indexOf(status);
    return index === -1 ? 0 : ((index + 1) / statuses.length) * 100;
  };

  const getNextAction = (status) => {
    return {
      Accepted: { action: 'pickup', label: '📦 Mark Picked Up' },
      PickedUp: { action: 'start-transit', label: '🚗 Start Transit' },
      InTransit: { action: 'deliver', label: '✅ Mark Delivered' },
      Delivered: { action: 'complete', label: '🏁 Complete Delivery' },
    }[status] || null;
  };

  if (user?.role !== 'Volunteer') {
    return (
      <div className="rounded-3xl surface-muted p-8 text-center">
        <p className="text-slate-600">This page is only available for volunteers.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="rounded-3xl surface-card p-6 md:p-8 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Deliveries</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Track your current delivery assignments, update status as you move, and keep donors and recipients informed in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full lg:w-auto">
            <StatCard label="Pending" value={deliveries.filter((d) => d.status === 'Pending').length} tone="slate" />
            <StatCard label="Accepted" value={deliveries.filter((d) => d.status === 'Accepted').length} tone="blue" />
            <StatCard label="In Transit" value={deliveries.filter((d) => d.status === 'InTransit').length} tone="orange" />
            <StatCard label="Completed" value={deliveries.filter((d) => d.status === 'Completed').length} tone="emerald" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5">
        {deliveries.length === 0 ? (
          <div className="rounded-3xl surface-card p-10 text-center border border-slate-200">
            <p className="text-slate-600 text-lg">No deliveries assigned at the moment.</p>
          </div>
        ) : (
          deliveries.map((delivery) => {
            const nextAction = getNextAction(delivery.status);
            const isExpanded = expandedDeliveryId === delivery._id;
            const isLoadingAction = !!actionLoading[delivery._id];
            return (
            <div key={delivery._id} className="rounded-3xl surface-card shadow-soft overflow-hidden">
                <div className="p-6 md:p-7">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-900 truncate">Delivery #{delivery._id?.slice(-6) || 'N/A'}</h2>
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(delivery.status)}`}>
                          {delivery.status?.replace(/([A-Z])/g, ' $1').trim() || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Assigned to {delivery.volunteer?.name || 'a volunteer'} for {delivery.donation?.foodType || 'a donation'} pickup.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {nextAction && (
                        <button
                          onClick={() => updateStatus(delivery._id, nextAction.action)}
                          disabled={isLoadingAction}
                          className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                        >
                          {isLoadingAction ? 'Updating...' : nextAction.label}
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedDeliveryId(isExpanded ? null : delivery._id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--surface-muted)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface)]"
                      >
                        {isExpanded ? 'Hide details' : 'View details'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${getProgressPercentage(delivery.status)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{delivery.donation?.foodType || 'Food item unknown'}</span>
                      <span>•</span>
                      <span>{delivery.donation?.quantity || '-'} {delivery.donation?.unit || 'units'}</span>
                      <span>•</span>
                      <span>Recipient: {delivery.recipient?.name || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-[var(--surface-muted)] px-6 py-5 md:px-7 md:py-6">
                    {delivery.donation?.donor && (
                      <SectionBox title="Donor Information" accent="slate">
                        <StatLine label="Name" value={delivery.donation.donor.name} />
                        <StatLine
                          label="Phone"
                          value={
                            delivery.donation.donor.phone ? (
                              <a
                                href={`tel:${delivery.donation.donor.phone.replace(/[^+\d]/g, '')}`}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                {delivery.donation.donor.phone}
                              </a>
                            ) : (
                              'Unknown'
                            )
                          }
                        />
                      </SectionBox>
                    )}

                    {delivery.donation && (
                      <SectionBox title="Donation Details" accent="slate">
                        {delivery.donation.description && <StatLine label="Description" value={delivery.donation.description} />}
                        {delivery.donation.expiresAt && <StatLine label="Expires" value={new Date(delivery.donation.expiresAt).toLocaleString()} />}
                      </SectionBox>
                    )}

                    {delivery.statusHistory && delivery.statusHistory.length > 0 && (
                      <SectionBox title="Status History" accent="slate">
                        <div className="space-y-2">
                          {delivery.statusHistory.map((history, idx) => (
                            <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(history.status)}`}>
                                  {history.status}
                                </span>
                                <span className="text-slate-600 text-xs">{new Date(history.timestamp).toLocaleString()}</span>
                              </div>
                              {history.notes && <p className="text-slate-600 mt-2 text-xs">💬 {history.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </SectionBox>
                    )}

                    {delivery.deliveryNotes && (
                      <SectionBox title="Delivery Notes" accent="blue">
                        <p className="text-sm text-blue-800">{delivery.deliveryNotes}</p>
                      </SectionBox>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-3xl bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-4">📚 Delivery Lifecycle</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <LifecycleStep emoji="1️⃣" title="Pending" detail="Waiting for volunteer" />
          <LifecycleStep emoji="2️⃣" title="Accepted" detail="You accepted" />
          <LifecycleStep emoji="3️⃣" title="Picked Up" detail="Food collected" />
          <LifecycleStep emoji="4️⃣" title="In Transit" detail="On the way" />
          <LifecycleStep emoji="5️⃣" title="Delivered" detail="Reached NGO" />
          <LifecycleStep emoji="✓" title="Completed" detail="Finalized" />
        </div>
      </div>
    </div>
  );
};

const SectionBox = ({ title, accent, children }) => {
  const accentMap = {
    slate: 'bg-slate-50 border-slate-200',
    blue: 'bg-blue-50 border-blue-200',
  };
  return (
    <div className={`rounded-3xl p-4 border ${accentMap[accent]}`}>
      <h4 className="font-semibold text-slate-900 mb-3">{title}</h4>
      {children}
    </div>
  );
};

const StatLine = ({ label, value }) => (
  <p className="text-sm text-slate-600"><strong>{label}:</strong> {value}</p>
);

const LifecycleStep = ({ emoji, title, detail }) => (
  <div className="flex items-start gap-2">
    <span className="text-lg">{emoji}</span>
    <div>
      <p className="font-semibold text-blue-900">{title}</p>
      <p className="text-blue-800 text-xs">{detail}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, tone }) => {
  const toneMap = {
    slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-700',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-700',
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
  };
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${toneMap[tone]} p-4 border shadow-sm`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-[0.2em] mt-2 font-semibold">{label}</div>
    </div>
  );
};

export default DeliveryList;
