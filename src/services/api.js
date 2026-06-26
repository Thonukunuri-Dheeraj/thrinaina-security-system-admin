const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

// Helper to set and get JWT tokens
const ADMIN_TOKEN_KEY = 'thrinaina_admin_token';
const ADMIN_USER_KEY = 'thrinaina_admin_user';

const CUSTOMER_TOKEN_KEY = 'thrinaina_customer_token';
const CUSTOMER_USER_KEY = 'thrinaina_customer_user';

// Admin Auth State
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

export const getToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const isAuthenticated = () => !!getToken();
export const logout = () => {
  setToken(null);
  localStorage.removeItem(ADMIN_USER_KEY);
};

// Customer Auth State
export const setCustomerToken = (token) => {
  if (token) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  }
};

export const getCustomerToken = () => localStorage.getItem(CUSTOMER_TOKEN_KEY);
export const isCustomerAuthenticated = () => !!getCustomerToken();
export const customerLogout = () => {
  setCustomerToken(null);
  localStorage.removeItem(CUSTOMER_USER_KEY);
};

export const getStoredCustomer = () => {
  const user = localStorage.getItem(CUSTOMER_USER_KEY);
  return user ? JSON.parse(user) : null;
};

// Generic fetch wrapper with admin token injection
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

// Generic fetch wrapper with customer token injection
const fetchWithCustomerAuth = async (endpoint, options = {}) => {
  const token = getCustomerToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

export const api = {
  // Admin Auth API
  auth: {
    login: async (username, password) => {
      const data = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      }
      return data;
    },
    getMe: () => fetchWithAuth('/auth/me'),
  },

  // Customer Auth API
  customerAuth: {
    register: async (userData) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      return data;
    },
    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      if (data.success && data.token) {
        setCustomerToken(data.token);
        localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(data.user));
      }
      return data;
    },
    getMe: () => fetchWithCustomerAuth('/auth/customer-me'),
    updateProfile: async (profileData) => {
      const data = await fetchWithCustomerAuth('/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      if (data.success && data.user) {
        localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(data.user));
      }
      return data;
    },
  },

  // Bookings API
  bookings: {
    create: (bookingData) => 
      fetchWithCustomerAuth('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      }),
    getMyBookings: () => fetchWithCustomerAuth('/bookings/my-bookings'),
    getAll: () => fetchWithAuth('/bookings'),
    updateStatus: (id, status) => 
      fetchWithAuth(`/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    track: async (bookingId) => {
      const response = await fetch(`${API_BASE_URL}/bookings/track/${bookingId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Tracking failed');
      }
      return data;
    },
    delete: (id) => 
      fetchWithAuth(`/bookings/${id}`, {
        method: 'DELETE',
      }),
  },

  // Service Requests API
  requests: {
    create: (requestData) => 
      fetchWithCustomerAuth('/requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
      }),
    getAll: () => fetchWithAuth('/requests'),
    updateStatus: (id, status, admin_notes) => 
      fetchWithAuth(`/requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_notes }),
      }),
    track: async (requestId) => {
      const response = await fetch(`${API_BASE_URL}/requests/track/${requestId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Tracking failed');
      }
      return data;
    },
    delete: (id) => 
      fetchWithAuth(`/requests/${id}`, {
        method: 'DELETE',
      }),
  },

  // Contacts API
  contacts: {
    submit: (contactData) => 
      fetchWithAuth('/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData),
      }),
    getAll: () => fetchWithAuth('/contacts'),
    delete: (id) => 
      fetchWithAuth(`/contacts/${id}`, {
        method: 'DELETE',
      }),
  },

  // Dashboard API
  dashboard: {
    getStats: () => fetchWithAuth('/dashboard/stats'),
    getCharts: () => fetchWithAuth('/dashboard/charts'),
    getCustomers: () => fetchWithAuth('/dashboard/customers'),
    deleteCustomer: (id) => 
      fetchWithAuth(`/dashboard/customers/${id}`, {
        method: 'DELETE',
      }),
  },
};
