'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/axios'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    customer_name: '',
    phone_number: '',
    website_link: '',
    address: '',
    gst_number: '',
    msme_certificate: '',
    aadhar_number: '',
    pan_number: '',
    birthday: '',
    about_me: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if localStorage is available
      if (typeof window === 'undefined') {
        throw new Error('Browser environment required')
      }

      // Register user
      await apiClient.post('/api/v1/auth/register', formData)

      // Note: User is created as INACTIVE, so auto-login will fail
      // Show message and redirect to login
      alert('Registration successful! Your account has been created but is currently INACTIVE. Please contact the administrator to activate your account, or make a payment to activate automatically.')
      
      // Redirect to login page
      router.push('/login')
    } catch (err: any) {
      console.error('Registration error:', err)
      
      // Better error messages
      let errorMessage = 'Registration failed. Please try again.'
      
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-sm sm:text-base text-gray-600">Start using our APIs today</p>
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-900">
                <strong>Note:</strong> Your account will be inactive after registration. Please contact the administrator to activate your account or make a payment to activate automatically.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="John Doe"
              />
            </div>

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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="+1234567890"
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
                minLength={6}
              />
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              
              <div>
                <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer_name"
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Company/Organization Name"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone_number"
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="website_link" className="block text-sm font-medium text-gray-700 mb-2">
                  Website Link
                </label>
                <input
                  id="website_link"
                  type="url"
                  value={formData.website_link}
                  onChange={(e) => setFormData({ ...formData, website_link: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="https://example.com"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Complete address"
                  rows={3}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="gst_number" className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  id="gst_number"
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="27ABCDE1234F1Z5"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="msme_certificate" className="block text-sm font-medium text-gray-700 mb-2">
                  MSME Certificate Number
                </label>
                <input
                  id="msme_certificate"
                  type="text"
                  value={formData.msme_certificate}
                  onChange={(e) => setFormData({ ...formData, msme_certificate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="MSME Certificate Number"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number
                </label>
                <input
                  id="aadhar_number"
                  type="text"
                  value={formData.aadhar_number}
                  onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="pan_number" className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  id="pan_number"
                  type="text"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                  Birthday
                </label>
                <input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="about_me" className="block text-sm font-medium text-gray-700 mb-2">
                  About Me
                </label>
                <textarea
                  id="about_me"
                  value={formData.about_me}
                  onChange={(e) => setFormData({ ...formData, about_me: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Tell us about yourself or your business"
                  rows={4}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign in
              </Link>
            </p>
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

