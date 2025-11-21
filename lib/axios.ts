import axios from 'axios'

const apiUrl = 'https://apiservices-backend.onrender.com'

// Create axios instance
const apiClient = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // We're using Bearer tokens, not cookies
  timeout: 30000, // 30 second timeout for slow networks
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(error)
        }

        // Try to refresh the token
        const response = await axios.post(`${apiUrl}/api/v1/auth/refresh`, {
          refresh_token: refreshToken
        })

        const { access_token, refresh_token } = response.data

        // Update tokens in localStorage
        localStorage.setItem('access_token', access_token)
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token)
        }

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

