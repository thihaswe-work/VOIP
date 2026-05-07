import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, getStoredToken, removeToken } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (loginData) => {
    const response = await authApi.login(loginData);
    setToken(response.token);
    setUser(response.user);
    await AsyncStorage.setItem('authToken', response.token);
    await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    return response;
  };

  const register = async (registerData) => {
    const response = await authApi.register(registerData);
    setToken(response.token);
    setUser(response.user);
    await AsyncStorage.setItem('authToken', response.token);
    await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    return response;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await removeToken();
  };

  const updateUserData = async (data) => {
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateUserData, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
