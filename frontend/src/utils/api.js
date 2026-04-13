import axios from 'axios';

const TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '60000', 10); // 60s for Render free tier cold start

// Ensure baseURL ends with /api
const getBaseUrl = () => {
  let url = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (!url.endsWith('/api')) url += '/api';
  return url;
};

// Create axios instance
const API = axios.create({
  baseURL: getBaseUrl(),
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // ⭐ IMPORTANT for CORS + tokens
});

// ✅ REQUEST INTERCEPTOR - Add token to headers
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem('token');
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// ✅ RESPONSE INTERCEPTOR - Handle errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, code, message } = error;

    // Handle 401 - Token expired or invalid
    if (response?.status === 401) {
      console.warn('Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject({
        status: 401,
        message: 'Your session has expired. Please login again.'
      });
    }

    // Handle 403 - Forbidden
    if (response?.status === 403) {
      return Promise.reject({
        status: 403,
        message: 'You do not have permission to access this resource.'
      });
    }

    // Handle 404 - Not found
    if (response?.status === 404) {
      return Promise.reject({
        status: 404,
        message: 'The requested resource was not found.'
      });
    }

    // Handle 500+ - Server errors
    if (response?.status >= 500) {
      return Promise.reject({
        status: response.status,
        message: 'Server error. Please try again later.'
      });
    }

    // Handle network errors
    if (code === 'ECONNABORTED') {
      return Promise.reject({
        status: 0,
        message: 'Server is waking up, please wait a moment and try again (this can take up to 60 seconds).'
      });
    }

    if (!response) {
      // Network error or no response
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your internet connection.'
      });
    }

    // Use backend error message if available
    const backendMessage = response.data?.message || response.data?.error || message;

    return Promise.reject({
      status: response.status,
      message: backendMessage || 'An error occurred. Please try again.'
    });
  }
);

export default API;