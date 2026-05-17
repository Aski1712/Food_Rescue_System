import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DonationList from './pages/DonationList.jsx';
import DeliveryList from './pages/DeliveryList.jsx';
import LiveMap from './pages/LiveMap.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import NavBar from './components/NavBar.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Redirect to login if not authenticated
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--bg)]">
        <NavBar />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-10">
          <div className="w-full max-w-7xl mx-auto">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
              />
              <Route
                path="/donations"
                element={<ProtectedRoute><DonationList /></ProtectedRoute>}
              />
              <Route
                path="/deliveries"
                element={<ProtectedRoute><DeliveryList /></ProtectedRoute>}
              />
              <Route
                path="/map"
                element={<ProtectedRoute><LiveMap /></ProtectedRoute>}
              />
              <Route
                path="/admin"
                element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
