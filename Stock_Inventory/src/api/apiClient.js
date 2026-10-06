import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:9090/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token and flag the request as authenticated
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Tag so the response interceptor knows this request carried a token
      config._wasAuthenticated = true;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: only auto-logout on 401 from AUTHENTICATED requests.
//
// Auth endpoints (/auth/login, /auth/register) legitimately return 401 on
// bad credentials — those must NEVER trigger session clearing, because:
//   1. There is no active session to clear.
//   2. Clearing storage while a valid session exists (e.g. race condition
//      on a concurrent tab) would silently log the user out.
//
// Only requests that had a token attached AND were rejected with 401 represent
// a truly expired/invalid session worth clearing.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = Boolean(error.config?.url?.includes('/auth/'));
    const hadToken = Boolean(error.config?._wasAuthenticated);

    if (error.response?.status === 401 && hadToken && !isAuthEndpoint) {
      // Expired / invalid token — clear auth state everywhere
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('auth_user');

      // Navigate to home; auth guards will redirect to login.
      // Setting href is non-blocking: the current call stack (including any
      // catch block that wants to show an error dialog) finishes first.
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
