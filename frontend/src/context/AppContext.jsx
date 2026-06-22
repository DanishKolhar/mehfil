import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

const API_BASE_URL = 'http://localhost:5000/api';

export const AppProvider = ({ children }) => {
  const [token, setTokenState] = useState(localStorage.getItem('mehfil_token') || null);
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeGroupDetails, setActiveGroupDetails] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Initialize Axios Instance
  const api = axios.create({
    baseURL: API_BASE_URL
  });

  // Inject token to headers dynamically
  api.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle Token state and LocalStorage sync
  const setToken = (newToken) => {
    if (newToken) {
      localStorage.setItem('mehfil_token', newToken);
      setTokenState(newToken);
    } else {
      localStorage.removeItem('mehfil_token');
      setTokenState(null);
    }
  };

  // Auth User verification
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setIsLoadingUser(false);
        return;
      }

      try {
        setIsLoadingUser(true);
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        await refreshGroups();
      } catch (err) {
        console.error('Failed to verify session token:', err.message);
        logout();
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [token]);

  // Load active group workspace details when active group changes
  useEffect(() => {
    const fetchActiveGroupDetails = async () => {
      if (!activeGroup) {
        setActiveGroupDetails(null);
        return;
      }
      try {
        const res = await api.get(`/groups/${activeGroup.id}`);
        setActiveGroupDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch active workspace details:', err.message);
      }
    };

    fetchActiveGroupDetails();
  }, [activeGroup]);

  // Sync groups list
  const refreshGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
      
      // Auto-select first group if none is active
      if (res.data.length > 0 && !activeGroup) {
        // Retrieve last active group ID from local storage if exists
        const lastGroupId = localStorage.getItem('mehfil_active_group_id');
        const foundGroup = res.data.find(g => g.id.toString() === lastGroupId);
        if (foundGroup) {
          setActiveGroup(foundGroup);
        } else {
          setActiveGroup(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load groups:', err.message);
    }
  };

  const selectActiveGroup = (group) => {
    if (group) {
      localStorage.setItem('mehfil_active_group_id', group.id);
      setActiveGroup(group);
    } else {
      localStorage.removeItem('mehfil_active_group_id');
      setActiveGroup(null);
    }
  };

  const refreshActiveGroup = async () => {
    if (!activeGroup) return;
    try {
      const res = await api.get(`/groups/${activeGroup.id}`);
      setActiveGroupDetails(res.data);
    } catch (err) {
      console.error('Error refreshing active workspace:', err.message);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (fullName, email, password, confirmPassword) => {
    const res = await api.post('/auth/signup', { fullName, email, password, confirmPassword });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setGroups([]);
    setActiveGroup(null);
    setActiveGroupDetails(null);
    localStorage.removeItem('mehfil_active_group_id');
  };

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        setUser,
        groups,
        activeGroup,
        activeGroupDetails,
        isLoadingUser,
        selectActiveGroup,
        refreshActiveGroup,
        refreshGroups,
        login,
        signup,
        logout,
        api
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
