import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'Donor' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, location: { coordinates: [0, 0] } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to register');
      saveSession(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'Donor', label: 'Donor', desc: 'Share surplus food', icon: '🍕' },
    { value: 'NGO', label: 'NGO', desc: 'Receive & manage donations', icon: '🏢' },
    { value: 'Volunteer', label: 'Volunteer', desc: 'Deliver food to those in need', icon: '🚚' },
    { value: 'Admin', label: 'Admin', desc: 'Manage the platform', icon: '⚙️' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-2xl">
        <div className="surface-card rounded-2xl md:rounded-3xl shadow-soft p-6 md:p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Create Account</h1>
            <p className="text-slate-500 text-sm md:text-base mt-2">Join our food rescue mission today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Phone Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="input-field text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number *</label>
                <input
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 8900"
                  className="input-field text-sm md:text-base"
                />
              </div>
            </div>

            {/* Email and Password Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="input-field text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password *</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field text-sm md:text-base"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">I want to join as *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {roles.map((role) => (
                  <label
                    key={role.value}
                    className={`relative flex flex-col items-center p-4 rounded-xl md:rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      form.role === role.value
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={form.role === role.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-3xl mb-2">{role.icon}</span>
                    <span className={`font-semibold text-sm text-center ${form.role === role.value ? 'text-primary-700' : 'text-slate-900'}`}>
                      {role.label}
                    </span>
                    <span className="text-xs text-slate-500 text-center mt-1 line-clamp-2">{role.desc}</span>
                    {form.role === role.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl md:rounded-2xl bg-red-50 border border-red-200 animate-slide-up">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-600 font-medium">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full text-sm md:text-base font-semibold py-3 md:py-3.5">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating account...</span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link className="font-semibold text-primary-600 hover:text-primary-700 transition-colors" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
