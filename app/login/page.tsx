'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/axios'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if localStorage is available (for SSR compatibility)
      if (typeof window === 'undefined') {
        throw new Error('Browser environment required')
      }

      const response = await apiClient.post('/api/v1/auth/login', formData)

      // Validate response
      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from server')
      }

      // Store tokens
      try {
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('refresh_token', response.data.refresh_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      } catch (storageError) {
        console.error('localStorage error:', storageError)
        throw new Error('Failed to save login information. Please check your browser settings.')
      }

      // Redirect based on role
      if (response.data.user?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      // Better error messages
      let errorMessage = 'Login failed. Please check your credentials.'
      
      if (err.response) {
        // Server responded with error
        const detail = err.response.data?.detail
        const message = err.response.data?.message
        
        if (Array.isArray(detail)) {
          // FastAPI validation errors - format them nicely
          errorMessage = detail.map((error: any) => {
            const field = error.loc?.join('.') || 'field'
            const msg = error.msg || 'Invalid value'
            return `${field}: ${msg}`
          }).join(', ')
        } else if (typeof detail === 'string') {
          errorMessage = detail
        } else if (message) {
          errorMessage = message
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.'
      } else if (err.message) {
        // Error in request setup
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-2">Test Credentials:</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Admin: admin@example.com / admin123</p>
              <p>Client: client@example.com / client123</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

