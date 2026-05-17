import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('foodRescueToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAndRestoreSession = async () => {
      const storedUser = localStorage.getItem('foodRescueUser');
      const storedToken = localStorage.getItem('foodRescueToken');
      
      if (storedUser && storedToken) {
        try {
          // Verify token is still valid by making an API call
          const response = await api.get('/users/profile', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (response.data) {
            setUser(response.data);
            setToken(storedToken);
            localStorage.setItem('foodRescueUser', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          // Clear invalid token and user data
          localStorage.removeItem('foodRescueToken');
          localStorage.removeItem('foodRescueUser');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    validateAndRestoreSession();
  }, []);

  const saveSession = (session) => {
    setToken(session.token);
    setUser(session.user);
    localStorage.setItem('foodRescueToken', session.token);
    localStorage.setItem('foodRescueUser', JSON.stringify(session.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('foodRescueToken');
    localStorage.removeItem('foodRescueUser');
    // Remove auth header from future requests
    delete api.defaults.headers.common['Authorization'];
  };

  const authValue = {
    user,
    token,
    loading,
    saveSession,
    logout,
    api,
  };

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
