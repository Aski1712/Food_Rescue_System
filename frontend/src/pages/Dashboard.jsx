import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { userAPI } from '../api/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setError('');
      const response = await userAPI.getDashboard();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) return <LoadingSpinner />;

  const StatCard = ({ title, value, icon, gradient }) => (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-6 md:p-8 text-white shadow-soft border border-white/10 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm md:text-base font-semibold opacity-90">{title}</p>
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
          <span className="text-xl md:text-2xl">{icon}</span>
        </div>
      </div>
      <p className="text-4xl md:text-5xl font-bold">{value || 0}</p>
    </div>
  );

  const renderStats = () => {
    const common = [
      <StatCard key="total" title="Total Donations" value={stats?.totalDonations} icon="🍕" gradient="from-slate-700 to-slate-900" />
    ];

    if (user?.role === 'Donor') {
      return [
        ...common,
        <StatCard key="my" title="My Donations" value={stats?.myDonations} icon="📦" gradient="from-emerald-500 to-emerald-600" />,
        <StatCard key="active" title="Active Donations" value={stats?.activeDonations} icon="✓" gradient="from-blue-500 to-blue-600" />,
      ];
    } else if (user?.role === 'NGO') {
      return [
        ...common,
        <StatCard key="available" title="Available" value={stats?.availableDonations} icon="📍" gradient="from-emerald-500 to-emerald-600" />,
        <StatCard key="accepted" title="Accepted" value={stats?.acceptedDonations} icon="✓" gradient="from-blue-500 to-blue-600" />,
      ];
    } else if (user?.role === 'Volunteer') {
      return [
        ...common,
        <StatCard key="assigned" title="Assigned" value={stats?.assignedDeliveries} icon="📋" gradient="from-emerald-500 to-emerald-600" />,
        <StatCard key="progress" title="In Progress" value={stats?.inProgressDeliveries} icon="🚚" gradient="from-blue-500 to-blue-600" />,
      ];
    } else if (user?.role === 'Admin') {
      return [
        ...common,
        <StatCard key="users" title="Total Users" value={stats?.totalUsers} icon="👥" gradient="from-emerald-500 to-emerald-600" />,
        <StatCard key="donors" title="Donors" value={stats?.donors} icon="💰" gradient="from-amber-500 to-amber-600" />,
        <StatCard key="ngos" title="NGOs" value={stats?.ngos} icon="🏢" gradient="from-orange-500 to-orange-600" />,
        <StatCard key="volunteers" title="Volunteers" value={stats?.volunteers} icon="👤" gradient="from-purple-500 to-purple-600" />,
      ];
    }
    return common;
  };
  return (
    <div className="w-full space-y-6 md:space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="rounded-2xl md:rounded-3xl surface-card p-6 md:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-6">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900">Welcome back, {user?.name}! 👋</h1>
            <p className="text-slate-600 mt-2 text-sm md:text-base">
              You're logged in as{' '}
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs md:text-sm font-semibold bg-primary-100 text-primary-700 ml-1">
                {user?.role}
              </span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-primary-600 text-white font-semibold text-sm md:text-base hover:bg-primary-700 transition-all duration-200 disabled:opacity-50"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 md:p-5 rounded-xl md:rounded-2xl bg-red-50 border border-red-200 animate-slide-up">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm md:text-base text-red-600 font-medium">{error}</span>
        </div>
      )}

      {/* Pending Volunteer Banner */}
      {user?.role === 'Volunteer' && user?.status !== 'approved' && (
        <div className="rounded-2xl md:rounded-3xl bg-amber-50 border border-amber-200 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 md:w-8 md:h-8 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-bold text-amber-800 mb-2">Account Pending Approval</h3>
              <p className="text-amber-700 text-sm md:text-base">
                Your volunteer account is currently under review by an administrator. You can explore the platform and view the live map, but delivery and donation creation features are restricted until approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}

      {/* Quick Actions Section */}
      <div className="rounded-2xl md:rounded-3xl surface-card p-6 md:p-8 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">Quick Actions</h2>
            <p className="text-slate-600 text-sm md:text-base mt-1">Things you can do as a {user?.role}</p>
          </div>
        </div>
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
          {roleCards[user?.role]?.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className="group flex items-start gap-4 p-4 md:p-6 rounded-xl md:rounded-2xl border border-[var(--surface-muted)] bg-[var(--surface-muted)] hover:bg-[var(--surface)] hover:border-[var(--accent-soft)] hover:shadow-card transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-200">
                <span className="text-xl md:text-2xl">{card.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base md:text-lg font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">{card.title}</p>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{card.subtitle}</p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 md:p-8 border border-slate-200">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary-100 flex items-center justify-center">
            <svg className="w-6 h-6 md:w-7 md:h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900">Dashboard Information</h3>
            <p className="mt-2 text-slate-600 text-sm md:text-base">
              This dashboard displays real-time statistics from the backend API. All data is fetched securely using JWT authentication. Use the refresh button to update stats or navigate to specific sections for more details about your role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const roleCards = {
  Donor: [
    { title: 'Create Donation', to: '/donations', emoji: '📦', subtitle: 'Submit new food donation and track its status.' },
    { title: 'View Donations', to: '/donations', emoji: '👁️', subtitle: 'See acceptance and delivery progress.' },
  ],
  NGO: [
    { title: 'Available Donations', to: '/donations', emoji: '🍕', subtitle: 'Review local donations and accept requests.' },
    { title: 'Live Tracking', to: '/map', emoji: '🗺️', subtitle: 'Watch delivery activity and coordinate.' },
  ],
  Volunteer: [
    { title: 'My Deliveries', to: '/deliveries', emoji: '🚚', subtitle: 'Accept tasks and update your location.' },
    { title: 'Live Map', to: '/map', emoji: '📍', subtitle: 'Report movement in real-time.' },
    { title: 'Create Donation', to: '/donations', emoji: '📦', subtitle: 'Share a donation opportunity with nearby NGOs.', },
  ],
  Admin: [
    { title: 'User Management', to: '/admin', emoji: '👥', subtitle: 'Review users and monitor activity.' },
    { title: 'System Overview', to: '/dashboard', emoji: '📊', subtitle: 'Manage roles and view metrics.' },
  ],
};

export default Dashboard;
