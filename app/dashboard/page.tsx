'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import apiClient from '../../lib/axios'
import { Key, Activity, Copy, Check, X, Plus, Trash2, LogOut, ShoppingCart, CreditCard, Package, Zap, Loader, Menu, Search, Settings } from 'lucide-react'
import ApiTester from '../components/ApiTester'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  status: string
  last_used_at: string | null
  created_at: string
  full_key?: string
  service_id?: string
  service?: {
    id: string
    name: string
    slug: string
  }
  services?: Array<{
    id: string
    name: string
    slug: string
  }>
  allowed_services?: string[]
  whitelist_urls?: string[]
}

interface Service {
  id: string
  name: string
  slug: string
  description: string
  price_per_call: number
  category?: {
    name: string
  }
}

interface Subscription {
  id: string
  service_id: string
  service?: Service
  status: string
  credits_allocated: number
  credits_remaining: number
  expires_at: string | null
  created_at?: string
  started_at?: string
}

interface CreditBalance {
  total_credits: number
  credits_used: number
  credits_remaining: number
}

export default function ClientDashboard() {
  const router = useRouter()
  const wsRef = useRef<WebSocket | null>(null)
  const [user, setUser] = useState<any>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [services, setServices] = useState<Service[]>([])
  // Subscriptions removed - using service access instead
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'keys' | 'marketplace' | 'credits'>('keys')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedKeyForTesting, setSelectedKeyForTesting] = useState<string | null>(null)
  const [isLoadingKeys, setIsLoadingKeys] = useState(false)
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null)
  const [isLoadingServiceAccess, setIsLoadingServiceAccess] = useState(false)
  
  // API Key Generation State
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [whitelistUrls, setWhitelistUrls] = useState<string[]>([''])
  const [userServiceAccess, setUserServiceAccess] = useState<Service[]>([])
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  
  // Password Change State
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        router.push('/login')
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        if (parsedUser.role === 'admin') {
          router.push('/admin')
          return
        }

        setUser(parsedUser)
        // Fetch data and services in parallel
        await Promise.all([
          fetchData(),
          fetchServices(),
          fetchUserServiceAccess()
        ])
        setupWebSocket(parsedUser.id, token)
      } catch (err) {
        console.error('Failed to load initial data:', err)
        // If there's an error, redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  // Fetch services when marketplace tab is opened
  useEffect(() => {
    if (activeTab === 'marketplace' && services.length === 0) {
      fetchServices()
    }
  }, [activeTab])

  const setupWebSocket = (userId: string, token: string) => {
    const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://apiservices-backend.onrender.com'
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    
    try {
      const ws = new WebSocket(`${wsUrl}/ws/${userId}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        // Reconnect after 3 seconds
        setTimeout(() => setupWebSocket(userId, token), 3000)
      }
    } catch (error) {
      console.error('Failed to setup WebSocket:', error)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'api_call':
        // Refresh usage stats
        fetchData()
        break
      case 'credit_purchase':
      case 'credit_balance_update':
        // Update credit balance
        if (data.data) {
          setCreditBalance({
            total_credits: data.data.total_credits || creditBalance?.total_credits || 0,
            credits_used: data.data.credits_used || creditBalance?.credits_used || 0,
            credits_remaining: data.data.credits_remaining || data.data.new_balance || creditBalance?.credits_remaining || 0
          })
        }
        break
    }
  }

  const fetchData = async (token?: string) => {
    setIsLoadingKeys(true)
    try {
      const [keysRes, balanceRes] = await Promise.all([
        apiClient.get('/api/v1/client/api-keys').catch(err => {
          console.error('Failed to fetch API keys:', err)
          return { data: [] }
        }),
        apiClient.get('/api/v1/client/credits/balance').catch(err => {
          console.error('Failed to fetch credit balance:', err)
          return { data: { total_credits: 0, credits_used: 0, credits_remaining: 0 } }
        })
      ])
      
      // Show loading feedback during fetch

      setApiKeys(keysRes.data || [])
      // Ensure creditBalance has all required fields with defaults
      if (balanceRes.data) {
        setCreditBalance({
          total_credits: balanceRes.data.total_credits || 0,
          credits_used: balanceRes.data.credits_used || 0,
          credits_remaining: balanceRes.data.credits_remaining || 0
        })
      }
      
      // Auto-select first active key for testing (only if full_key is available)
      // Note: full_key is only available when creating a new key, not in list
      // So we won't auto-select from list
    } catch (err: any) {
      console.error('Failed to fetch data:', err)
      // Set defaults on error to prevent UI from being stuck
      if (!creditBalance) {
        setCreditBalance({
          total_credits: 0,
          credits_used: 0,
          credits_remaining: 0
        })
      }
    } finally {
      setLoading(false)
      setIsLoadingKeys(false)
    }
  }

  const fetchUserServiceAccess = async () => {
    setIsLoadingServiceAccess(true)
    try {
      const response = await apiClient.get('/api/v1/client/service-access')
      setUserServiceAccess(response.data || [])
    } catch (err) {
      console.error('Failed to fetch service access:', err)
      setUserServiceAccess([])
    } finally {
      setIsLoadingServiceAccess(false)
    }
  }

  const fetchServices = async () => {
    setIsLoadingServices(true)
    try {
      const response = await apiClient.get('/api/v1/client/services')
      setServices(response.data || [])
    } catch (err) {
      console.error('Failed to fetch services:', err)
      setServices([]) // Set empty array on error
    } finally {
      setIsLoadingServices(false)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return

    setDeletingKeyId(keyId)
    try {
      await apiClient.delete(`/api/v1/client/api-keys/${keyId}`)

      setApiKeys(apiKeys.filter(k => k.id !== keyId))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete API key')
    } finally {
      setDeletingKeyId(null)
    }
  }

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleGenerateApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key')
      return
    }

    // Filter out empty whitelist URLs
    const validWhitelistUrls = whitelistUrls.filter(url => url.trim() !== '')

    setIsGeneratingKey(true)
    try {
      // Don't send service_ids - backend will automatically use all services user has access to
      const response = await apiClient.post('/api/v1/client/api-keys/generate', {
        name: newKeyName,
        service_ids: [], // Empty array - backend will auto-populate with all accessible services
        whitelist_urls: validWhitelistUrls.length > 0 ? validWhitelistUrls : undefined
      })

      // Add the new key to the list
      setApiKeys([response.data, ...apiKeys])
      
      // Reset form
      setNewKeyName('')
      setSelectedServiceIds([])
      setWhitelistUrls([''])
      setServiceSearchTerm('')
      setShowGenerateKeyModal(false)
      
      alert('API key generated successfully! Make sure to copy it now - you won\'t be able to see it again.')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate API key')
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const addWhitelistUrl = () => {
    setWhitelistUrls([...whitelistUrls, ''])
  }

  const removeWhitelistUrl = (index: number) => {
    setWhitelistUrls(whitelistUrls.filter((_, i) => i !== index))
  }

  const updateWhitelistUrl = (index: number, value: string) => {
    const updated = [...whitelistUrls]
    updated[index] = value
    setWhitelistUrls(updated)
  }

  const handleLogout = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields')
      return
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match')
      return
    }

    setIsChangingPassword(true)
    try {
      await apiClient.put('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })

      alert('Password changed successfully!')
      
      // Reset form and close modal
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordChangeModal(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchServices()
      fetchUserServiceAccess() // Refresh service access when marketplace tab is opened
    }
  }, [activeTab])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-black">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <header className="bg-white border-b">
        <div className="container mx-auto px-2 sm:px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-bold text-black">Client Dashboard</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {creditBalance && creditBalance.credits_remaining !== undefined && (
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-blue-50 rounded-lg">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
                <span className="text-xs sm:text-sm font-semibold text-black">
                  {(creditBalance.credits_remaining || 0).toFixed(2)} Credits
                </span>
              </div>
            )}
            <span className="text-xs sm:text-sm text-black truncate max-w-[100px] sm:max-w-none">{user?.email}</span>
            <button
              onClick={() => setShowPasswordChangeModal(true)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-black hover:text-black text-sm sm:text-base"
              title="Change Password"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-black hover:text-black text-sm sm:text-base"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-4 sm:mb-8">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('keys')}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'keys'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <Key className="w-4 h-4 inline mr-1 sm:mr-2" />
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'marketplace'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1 sm:mr-2" />
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'credits'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-1 sm:mr-2" />
              Credits
            </button>
          </div>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-black" />
                <h2 className="text-xl font-bold text-black">API Keys</h2>
              </div>
              <button
                onClick={() => setShowGenerateKeyModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Generate New Key</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 border-b bg-blue-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                  </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">API Key Management</p>
                  <p className="text-sm text-blue-700">
                    Generate and manage your API keys for services you have access to.
                  </p>
                    </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {isLoadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-black">Loading API keys...</span>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-black font-medium mb-2">No API Keys Yet</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate your first API key to start using the services you have access to.
                  </p>
                  <button
                    onClick={() => setShowGenerateKeyModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Generate API Key
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-black">{key.name}</h3>
                          {key.service && (
                            <p className="text-sm text-black mt-1">Service: {key.service.name}</p>
                          )}
                          {key.services && key.services.length > 0 && (
                            <p className="text-sm text-black mt-1">
                              Services: {key.services.map(s => s.name).join(', ')}
                            </p>
                          )}
                          {key.allowed_services && key.allowed_services.includes('*') && (
                            <p className="text-sm text-green-600 mt-1 font-semibold">All Services Access</p>
                          )}
                          {key.whitelist_urls && key.whitelist_urls.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Whitelisted: {key.whitelist_urls.join(', ')}
                            </p>
                          )}
                          {key.full_key ? (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Full API Key:</p>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <code className="text-xs break-all block text-black font-mono">
                                {key.full_key}
                              </code>
                                <button
                                  onClick={() => copyToClipboard(key.full_key!, key.id)}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                >
                                  {copiedKey === key.id ? '✓ Copied!' : 'Copy Key'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mt-1">
                              {key.key_prefix}... (Key not available - contact admin to regenerate)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            key.status === 'active' ? 'bg-green-100 text-black' : 'bg-gray-100 text-black'
                          }`}>
                            {key.status}
                          </span>
                          {key.full_key && (
                            <>
                              <button
                                onClick={() => copyToClipboard(key.full_key!, key.id)}
                                className="p-2 hover:bg-gray-100 rounded"
                                title="Copy API Key"
                              >
                                {copiedKey === key.id ? (
                                  <Check className="w-4 h-4 text-black" />
                                ) : (
                                  <Copy className="w-4 h-4 text-black" />
                                )}
                              </button>
                              <button
                                onClick={() => setSelectedKeyForTesting(key.full_key!)}
                                className={`px-3 py-1 text-xs rounded ${
                                  selectedKeyForTesting === key.full_key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-black hover:bg-gray-200'
                                }`}
                                title="Use for API Testing"
                              >
                                {selectedKeyForTesting === key.full_key ? 'Testing' : 'Test'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteApiKey(key.id)}
                            disabled={deletingKeyId === key.id}
                            className={`p-2 rounded text-black ${
                              deletingKeyId === key.id 
                                ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                                : 'hover:bg-red-50'
                            }`}
                            title={deletingKeyId === key.id ? 'Deleting...' : 'Delete API Key'}
                          >
                            {deletingKeyId === key.id ? (
                              <Loader className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                            <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-black">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <>
            {isLoadingServices ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-black">Loading services...</span>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              // Check if user has access to this service (based on admin-granted access, not API keys)
              const hasServiceAccess = userServiceAccess.some(access => access.id === service.id)
              
              return (
                <div key={service.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h3 className="text-lg font-bold mb-2 text-black">{service.name}</h3>
                  <p className="text-sm text-black mb-4">{service.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-black">
                      {service.price_per_call} credit{service.price_per_call !== 1 ? 's' : ''} per API call
                    </span>
                    {service.category && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded text-black">
                        {service.category.name}
                      </span>
                    )}
                  </div>
                  {hasServiceAccess ? (
                    <div className="w-full px-4 py-2 bg-green-50 text-green-900 rounded-lg text-center text-sm border border-green-200 font-semibold">
                      ✓ You have access to this service
                    </div>
                  ) : (
                    <p className="w-full px-4 py-2 bg-blue-50 text-blue-900 rounded-lg text-center text-sm border border-blue-200">
                      Contact admin to grant access to this service
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
          </>
        )}


        {/* Credits Tab */}
        {activeTab === 'credits' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-black">Credit Balance</h2>
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Need More Credits?</strong> Please contact your service provider to purchase additional credits with flexible pricing options.
                </p>
              </div>
            </div>
            {creditBalance ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div className="text-center">
                    <p className="text-sm text-black mb-2">Total Credits</p>
                    <p className="text-2xl font-bold text-black">{(creditBalance.total_credits || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-black mb-2">Credits Used</p>
                    <p className="text-2xl font-bold text-black">{(creditBalance.credits_used || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-black mb-2">Credits Remaining</p>
                    <p className="text-2xl font-bold text-black">{(creditBalance.credits_remaining || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-sm text-black">
                    <strong>Note:</strong> Credit pricing may vary per user. Contact admin for custom pricing options.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <p className="text-black text-center py-8">Loading credit balance...</p>
              </div>
            )}
          </div>
        )}


        {/* API Testing Section */}
        {selectedKeyForTesting && activeTab === 'keys' && (
          <div className="mt-8">
            <ApiTester apiKey={selectedKeyForTesting} />
          </div>
        )}

        {/* Generate API Key Modal */}
        {showGenerateKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold text-black">Generate New API Key</h2>
                  <button
                    onClick={() => {
                      setShowGenerateKeyModal(false)
                      setNewKeyName('')
                      setSelectedServiceIds([])
                      setWhitelistUrls([''])
                      setServiceSearchTerm('')
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Key Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Key, Test Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Service Access
                  </label>
                  {isLoadingServiceAccess ? (
                    <div className="border border-gray-300 rounded-lg p-3 flex items-center justify-center min-h-[100px]">
                      <Loader className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-3 text-sm text-black">Loading services...</span>
                    </div>
                  ) : userServiceAccess.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-900">
                        You don't have access to any services yet. Please contact your administrator to grant service access.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        This API key will have access to all services you've been granted access to:
                      </p>
                      {/* Search Input */}
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={serviceSearchTerm}
                            onChange={(e) => setServiceSearchTerm(e.target.value)}
                            placeholder="Search services..."
                            className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm bg-white"
                          />
                        </div>
                      </div>
                      <div className="border border-blue-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                        {userServiceAccess
                          .filter(service => 
                            service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
                            (service.description && service.description.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                          )
                          .map((service) => (
                            <div key={service.id} className="flex items-center space-x-2 py-2">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-black font-medium">{service.name}</span>
                                {service.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">{service.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        {userServiceAccess.filter(service => 
                          service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
                          (service.description && service.description.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                        ).length === 0 && serviceSearchTerm && (
                          <div className="text-center py-4 text-sm text-gray-500">
                            No services found matching "{serviceSearchTerm}"
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        {serviceSearchTerm ? (
                          <>
                            Showing {userServiceAccess.filter(service => 
                              service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
                              (service.description && service.description.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
                            ).length} of {userServiceAccess.length} service{userServiceAccess.length !== 1 ? 's' : ''}
                          </>
                        ) : (
                          <>
                            Total: {userServiceAccess.length} service{userServiceAccess.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Whitelist URLs (Optional)
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Restrict API key usage to specific source URLs. Leave empty to allow from any origin.
                  </p>
                  {whitelistUrls.map((url, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                          const updated = [...whitelistUrls]
                          updated[index] = e.target.value
                          setWhitelistUrls(updated)
                        }}
                        placeholder="https://example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      />
                      {whitelistUrls.length > 1 && (
                        <button
                          onClick={() => setWhitelistUrls(whitelistUrls.filter((_, i) => i !== index))}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setWhitelistUrls([...whitelistUrls, ''])}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add URL
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={isGeneratingKey || !newKeyName.trim() || userServiceAccess.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isGeneratingKey ? 'Generating...' : 'Generate API Key'}
                  </button>
                  <button
                    onClick={() => {
                      setShowGenerateKeyModal(false)
                      setNewKeyName('')
                      setSelectedServiceIds([])
                      setWhitelistUrls([''])
                      setServiceSearchTerm('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordChangeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-4 sm:p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold text-black">Change Password</h2>
                  <button
                    onClick={() => {
                      setShowPasswordChangeModal(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="Enter new password (min 6 characters)"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordChangeModal(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
