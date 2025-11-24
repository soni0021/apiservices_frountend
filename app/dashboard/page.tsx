'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import apiClient from '../../lib/axios'
import { Key, Activity, Copy, Check, X, Plus, Trash2, LogOut, ShoppingCart, CreditCard, Package, Zap, Loader } from 'lucide-react'
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'keys' | 'marketplace' | 'subscriptions' | 'credits'>('keys')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedKeyForTesting, setSelectedKeyForTesting] = useState<string | null>(null)
  const [isLoadingKeys, setIsLoadingKeys] = useState(false)
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role === 'admin') {
      router.push('/admin')
      return
    }

    setUser(parsedUser)
    // Fetch data and services in parallel
    Promise.all([
      fetchData(),
      fetchServices()
    ]).catch(err => {
      console.error('Failed to load initial data:', err)
      setLoading(false) // Ensure loading state is cleared even on error
    })
    setupWebSocket(parsedUser.id, token)
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
      case 'subscription':
        // Refresh subscriptions
        fetchSubscriptions()
        break
    }
  }

  const fetchData = async (token?: string) => {
    setIsLoadingKeys(true)
    try {
      const [keysRes, balanceRes, subscriptionsRes] = await Promise.all([
        apiClient.get('/api/v1/client/api-keys').catch(err => {
          console.error('Failed to fetch API keys:', err)
          return { data: [] }
        }),
        apiClient.get('/api/v1/client/credits/balance').catch(err => {
          console.error('Failed to fetch credit balance:', err)
          return { data: { total_credits: 0, credits_used: 0, credits_remaining: 0 } }
        }),
        apiClient.get('/api/v1/client/subscriptions').catch(err => {
          console.error('Failed to fetch subscriptions:', err)
          return { data: [] }
        })
      ])

      setApiKeys(keysRes.data || [])
      // Ensure creditBalance has all required fields with defaults
      if (balanceRes.data) {
        setCreditBalance({
          total_credits: balanceRes.data.total_credits || 0,
          credits_used: balanceRes.data.credits_used || 0,
          credits_remaining: balanceRes.data.credits_remaining || 0
        })
      }
      setSubscriptions(subscriptionsRes.data || [])
      
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

  const fetchSubscriptions = async (token?: string) => {
    try {
      const response = await apiClient.get('/api/v1/client/subscriptions')
      setSubscriptions(response.data)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
    }
  }

  // API key generation removed - Admin-only feature now

  // Subscription creation removed - only admins can create subscriptions
  // Clients can only view their subscriptions
  
  // Credit purchase removed - admin-only feature now
  // Clients must contact admin to purchase credits

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return

    try {
      await apiClient.delete(`/api/v1/client/api-keys/${keyId}`)

      setApiKeys(apiKeys.filter(k => k.id !== keyId))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
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

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchServices()
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Client Dashboard</h1>
          <div className="flex items-center gap-4">
            {creditBalance && creditBalance.credits_remaining !== undefined && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <Zap className="w-4 h-4 text-black" />
                <span className="text-sm font-semibold text-black">
                  {(creditBalance.credits_remaining || 0).toFixed(2)} Credits
                </span>
              </div>
            )}
            <span className="text-black">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-black hover:text-black"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('keys')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'keys'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <Key className="w-4 h-4 inline mr-2" />
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'marketplace'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'subscriptions'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'credits'
                  ? 'border-b-2 border-blue-600 text-black'
                  : 'text-black hover:text-black'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Credits
            </button>
          </div>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-black" />
                <h2 className="text-xl font-bold text-black">API Keys</h2>
              </div>
            </div>
            
            <div className="p-6 border-b bg-blue-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">API Key Management</p>
                  <p className="text-sm text-blue-700">
                    API keys are generated by administrators. Please contact your admin to request an API key with the services you need access to.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-black">Loading API keys...</span>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-black font-medium mb-2">No API Keys Yet</p>
                  <p className="text-sm text-gray-600">
                    Contact your administrator to request an API key. They can generate one with access to the services you need.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4">
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
                            className="p-2 hover:bg-red-50 rounded text-black"
                          >
                            <Trash2 className="w-4 h-4" />
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
              const hasSubscription = subscriptions.some(
                sub => sub.service_id === service.id && sub.status === 'active'
              )
              
              // Check if user has API key with access to this service
              const hasApiKeyAccess = apiKeys.some(key => {
                if (key.status !== 'active') return false
                if (key.allowed_services && key.allowed_services.includes('*')) return true
                if (key.allowed_services && key.allowed_services.includes(service.id)) return true
                if (key.service_id === service.id) return true
                return false
              })
              
              return (
                <div key={service.id} className="bg-white rounded-lg shadow p-6">
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
                  {hasApiKeyAccess ? (
                    <div className="w-full px-4 py-2 bg-green-50 text-green-900 rounded-lg text-center text-sm border border-green-200 font-semibold">
                      ✓ You have API key access to this service
                    </div>
                  ) : (
                    <p className="w-full px-4 py-2 bg-blue-50 text-blue-900 rounded-lg text-center text-sm border border-blue-200">
                      {hasSubscription 
                        ? 'Contact admin to request API key for this service'
                        : 'Contact admin to subscribe and request API key'}
                    </p>
                  )}
                </div>
              )
            })}
              </div>
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-black">My Subscriptions</h2>
              <p className="text-sm text-gray-600 mt-1">Your active service subscriptions</p>
            </div>
            <div className="p-6">
              {subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-black font-medium mb-2">No Subscriptions Yet</p>
                  <p className="text-sm text-gray-600">
                    Contact your administrator to get a subscription for the services you need.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-black mb-1">{sub.service?.name || 'Service'}</h3>
                          {sub.service?.description && (
                            <p className="text-sm text-gray-600 mb-3">{sub.service.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Credits Allocated</p>
                              <p className="text-lg font-semibold text-black">{(sub.credits_allocated || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Credits Remaining</p>
                              <p className={`text-lg font-semibold ${
                                (sub.credits_remaining || 0) < (sub.credits_allocated || 0) * 0.2 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {(sub.credits_remaining || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          {sub.expires_at && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-xs text-gray-500 mb-1">Expires On</p>
                              <p className="text-sm font-medium text-black">
                                {new Date(sub.expires_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-gray-500 mb-1">Started</p>
                            <p className="text-sm text-black">
                              {(sub.started_at || sub.created_at) ? new Date(sub.started_at || sub.created_at!).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          sub.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
              <div className="p-6">
                <div className="grid grid-cols-3 gap-6 mb-6">
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-black">
                    <strong>Note:</strong> Credit pricing may vary per user. Contact admin for custom pricing options.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6">
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
      </main>
    </div>
  )
}
