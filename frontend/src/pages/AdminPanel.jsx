import { useEffect, useState, useMemo } from 'react';
import api from '../api/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const fetchAdminData = async () => {
    setError('');
    setLoading(true);
    try {
      const [usersRes, pendingVolRes, donationsRes, deliveriesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/pending-volunteers'),
        api.get('/donations/all'),
        api.get('/deliveries'),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setPendingVolunteers(Array.isArray(pendingVolRes.data) ? pendingVolRes.data : []);
      setDonations(Array.isArray(donationsRes.data) ? donationsRes.data : []);
      setDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
    } catch (err) {
      console.error('Admin panel load error:', err);
      setError('Unable to load admin data. Please refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const roleCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {});
  }, [users]);

  const setLoadingAction = (key, value) => {
    setActionLoading((prev) => ({ ...prev, [key]: value }));
  };

  const handleDonationAction = async (donationId, action) => {
    setError('');
    setLoadingAction(`donation-${donationId}`, true);
    try {
      await api.put(`/donations/${donationId}/${action}`);
      await fetchAdminData();
    } catch (err) {
      console.error('Donation action error:', err);
      setError(err.response?.data?.message || 'Unable to update donation status.');
    } finally {
      setLoadingAction(`donation-${donationId}`, false);
    }
  };

  const handleVolunteerAction = async (volunteerId, action) => {
    setError('');
    setLoadingAction(`${action}-${volunteerId}`, true);
    try {
      await api.put(`/users/${volunteerId}/${action}`);
      await fetchAdminData();
    } catch (err) {
      console.error('Volunteer action error:', err);
      setError(err.response?.data?.message || `Unable to ${action} volunteer.`);
    } finally {
      setLoadingAction(`${action}-${volunteerId}`, false);
    }
  };

  const deliveryStatusTransitions = {
    Pending: ['Accepted'],
    Accepted: ['PickedUp'],
    PickedUp: ['InTransit'],
    InTransit: ['Delivered'],
    Delivered: ['Completed'],
    Completed: [],
  };

  const handleDeliveryStatus = async (deliveryId, status) => {
    setError('');
    setLoadingAction(`delivery-${deliveryId}`, true);
    try {
      await api.put(`/deliveries/${deliveryId}/status`, { status });
      await fetchAdminData();
    } catch (err) {
      console.error('Delivery action error:', err);
      setError(err.response?.data?.message || 'Unable to update delivery status.');
    } finally {
      setLoadingAction(`delivery-${deliveryId}`, false);
    }
  };

  const donationCounts = useMemo(() => {
    return donations.reduce((counts, donation) => {
      counts[donation.status] = (counts[donation.status] || 0) + 1;
      return counts;
    }, {});
  }, [donations]);

  const deliveryCounts = useMemo(() => {
    return deliveries.reduce((counts, delivery) => {
      counts[delivery.status] = (counts[delivery.status] || 0) + 1;
      return counts;
    }, {});
  }, [deliveries]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl surface-card p-6 md:p-8 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Admin Panel</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Review users, donations, and delivery activity across the platform.
            </p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchAdminData();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
      </section>

      <div className="rounded-3xl surface-muted p-4 md:p-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Users" value={users.length} />
        <SummaryCard label="Total Donations" value={donations.length} />
        <SummaryCard label="Total Deliveries" value={deliveries.length} />
      </div>

      <div className="rounded-3xl surface-card p-4 md:p-5 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['Users', 'Pending Volunteers', 'Donations', 'Deliveries'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-500">
            Showing {activeTab.toLowerCase()} overview with live admin metrics.
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'Users' && (
        <DataTable
          title="Registered Users"
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Role', key: 'role' },
            { label: 'Phone', key: 'phone' },
          ]}
          data={users}
          rowRenderer={(userItem) => ({
            name: userItem.name || '—',
            email: userItem.email || '—',
            role: userItem.role || '—',
            phone: userItem.phone || '—',
          })}
        />
      )}

      {activeTab === 'Pending Volunteers' && (
        <DataTable
          title="Pending Volunteer Approvals"
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Phone', key: 'phone' },
            { label: 'Actions', key: 'actions' },
          ]}
          data={pendingVolunteers}
          rowRenderer={(volunteer) => ({
            name: volunteer.name || '—',
            email: volunteer.email || '—',
            phone: volunteer.phone || '—',
            actions: (
              <div className="flex gap-2">
                <button
                  onClick={() => handleVolunteerAction(volunteer._id, 'approve')}
                  disabled={actionLoading[`approve-${volunteer._id}`]}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading[`approve-${volunteer._id}`] ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleVolunteerAction(volunteer._id, 'reject')}
                  disabled={actionLoading[`reject-${volunteer._id}`]}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading[`reject-${volunteer._id}`] ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            ),
          })}
        />
      )}

      {activeTab === 'Donations' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="Available" value={donationCounts.Available || 0} tone="emerald" />
            <StatusCard label="Accepted" value={donationCounts.Accepted || 0} tone="blue" />
            <StatusCard label="Rejected" value={donationCounts.Rejected || 0} tone="red" />
          </div>
          <DataTable
            title="All Donations"
            columns={[
              { label: 'Title', key: 'title' },
              { label: 'Donor', key: 'donor' },
              { label: 'NGO', key: 'ngo' },
              { label: 'Status', key: 'status' },
              { label: 'Quantity', key: 'quantity' },
              { label: 'Expires', key: 'expiryTime' },
              { label: 'Actions', key: 'actions' },
            ]}
            data={donations}
            rowRenderer={(donation) => {
              const donationActions = [];
              if (donation.status === 'Available') {
                donationActions.push(
                  <button
                    key="accept"
                    onClick={() => handleDonationAction(donation._id, 'accept')}
                    disabled={actionLoading[`donation-${donation._id}`]}
                    className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Accept
                  </button>
                );
                donationActions.push(
                  <button
                    key="reject"
                    onClick={() => handleDonationAction(donation._id, 'reject')}
                    disabled={actionLoading[`donation-${donation._id}`]}
                    className="rounded-2xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
                  >
                    Reject
                  </button>
                );
              }
              return {
                title: donation.title || '—',
                donor: donation.donor?.name || 'Unknown',
                ngo: donation.ngo?.name || '-',
                status: donation.status || '—',
                quantity: donation.quantity?.toString() || '—',
                expiryTime: donation.expiryTime ? new Date(donation.expiryTime).toLocaleDateString() : '—',
                actions: donationActions.length > 0 ? <div className="flex flex-wrap gap-2">{donationActions}</div> : '—',
              };
            }}
          />
        </div>
      )}

      {activeTab === 'Deliveries' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="Pending" value={deliveryCounts.Pending || 0} tone="slate" />
            <StatusCard label="In Transit" value={deliveryCounts.InTransit || 0} tone="orange" />
            <StatusCard label="Delivered" value={deliveryCounts.Delivered || 0} tone="emerald" />
          </div>
          <DataTable
            title="All Deliveries"
            columns={[
              { label: 'Delivery ID', key: 'id' },
              { label: 'Donation', key: 'donation' },
              { label: 'Volunteer', key: 'volunteer' },
              { label: 'Recipient', key: 'recipient' },
              { label: 'Status', key: 'status' },
              { label: 'Pickup', key: 'pickupTime' },
              { label: 'Delivery', key: 'deliveryTime' },
              { label: 'Actions', key: 'actions' },
            ]}
            data={deliveries}
            rowRenderer={(delivery) => {
              const nextStatuses = deliveryStatusTransitions[delivery.status] || [];
              const actionButtons = nextStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleDeliveryStatus(delivery._id, status)}
                  disabled={actionLoading[`delivery-${delivery._id}`]}
                  className="rounded-2xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 transition"
                >
                  Mark {status}
                </button>
              ));

              return {
                id: delivery._id?.slice(-6) || '—',
                donation: delivery.donation?.title || '—',
                volunteer: delivery.volunteer?.name || '—',
                recipient: delivery.recipient?.name || '—',
                status: delivery.status || '—',
                pickupTime: delivery.pickupTime ? new Date(delivery.pickupTime).toLocaleString() : '—',
                deliveryTime: delivery.deliveryTime ? new Date(delivery.deliveryTime).toLocaleString() : '—',
                actions: actionButtons.length > 0 ? <div className="flex flex-wrap gap-2">{actionButtons}</div> : '—',
              };
            }}
          />
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="rounded-3xl surface-card p-5 shadow-sm border border-slate-200 text-center">
    <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">{label}</p>
    <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const StatusCard = ({ label, value, tone }) => {
  const toneMap = {
    slate: 'bg-[var(--surface-muted)] text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <div className={`rounded-3xl border p-5 ${toneMap[tone]}`}>
      <p className="text-sm font-semibold tracking-[0.2em] uppercase">{label}</p>
      <p className="mt-4 text-3xl font-bold">{value}</p>
    </div>
  );
};

const DataTable = ({ title, columns, data, rowRenderer }) => (
  <div className="rounded-3xl surface-card p-6 shadow-soft border border-slate-200">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{data.length} records</p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-[var(--surface-muted)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-[var(--surface)]">
          {data.map((row, index) => {
            const values = rowRenderer(row);
            return (
              <tr key={index} className="hover:bg-[var(--surface-muted)] transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
                    {values[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default AdminPanel;
