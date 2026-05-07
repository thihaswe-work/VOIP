import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

export const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};

export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

const request = async (endpoint, options = {}) => {
  const token = await getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

export const authApi = {
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  login: (data) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getProfile: () => request('/auth/profile'),
  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  changePassword: (data) => request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

export const contactsApi = {
  search: (query) => request(`/contacts/search?query=${encodeURIComponent(query)}`),
  getAll: () => request('/contacts'),
  add: (contactId) => request('/contacts', {
    method: 'POST',
    body: JSON.stringify({ contactId })
  }),
  remove: (contactId) => request(`/contacts/${contactId}`, {
    method: 'DELETE'
  })
};

export const callsApi = {
  getHistory: () => request('/calls'),
  logCall: (data) => request('/calls', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

export default { authApi, contactsApi, callsApi };
