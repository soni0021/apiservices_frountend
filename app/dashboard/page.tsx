'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import apiClient from '../../lib/axios'
import { Key, Activity, Copy, Check, X, Plus, Trash2, LogOut, ShoppingCart, CreditCard, Package, Zap } from 'lucide-react'
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
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [selectedServiceForKey, setSelectedServiceForKey] = useState<string>('')
  const [newKeyName, setNewKeyName] = useState('')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedKeyForTesting, setSelectedKeyForTesting] = useState<string | null>(null)

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
    const apiUrl = 'https://apiservices-backend.onrender.com'
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
    }
  }

  const fetchServices = async () => {
    try {
      const response = await apiClient.get('/api/v1/client/services')
      setServices(response.data || [])
    } catch (err) {
      console.error('Failed to fetch services:', err)
      setServices([]) // Set empty array on error
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

  const createApiKey = async () => {
    if (!newKeyName.trim() || !selectedServiceForKey) {
      alert('Please select a service and enter a key name')
      return
    }

    try {
      const response = await apiClient.post(
        '/api/v1/client/api-keys/generate',
        { service_id: selectedServiceForKey, name: newKeyName }
      )

      const newKey = response.data
      // Refresh API keys list to get updated data
      const token = localStorage.getItem('access_token')
      if (token) {
        await fetchData()
      }
      setNewKeyName('')
      setSelectedServiceForKey('')
      setShowCreateKey(false)
      
      if (newKey.full_key) {
        setSelectedKeyForTesting(newKey.full_key)
        alert(`API key created successfully! Key: ${newKey.full_key}\n\n⚠️ Save this key - it will only be shown once!`)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create API key. Make sure you have an active subscription for this service.')
    }
  }

  // Subscription creation removed - only admins can create subscriptions
  // Clients can only view their subscriptions

  const purchaseCredits = async () => {
    const amount = parseFloat(purchaseAmount)
    if (!amount || amount < 1000) {
      alert('Minimum purchase amount is ₹1000')
      return
    }

    try {
      const response = await apiClient.post(
        '/api/v1/client/credits/purchase',
        { amount }
      )

      // Refresh all data after credit purchase
      await fetchData()
      setPurchaseAmount('')
      setShowPurchaseModal(false)
      alert(`Successfully purchased ${response.data.credits_purchased} credits!`)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to purchase credits')
    }
  }

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
              <button
                onClick={() => {
                  setShowCreateKey(!showCreateKey)
                  if (!showCreateKey) fetchServices()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Generate Key
              </button>
            </div>

            {showCreateKey && (
              <div className="p-6 border-b bg-gray-50">
                {subscriptions.filter(sub => sub.status === 'active').length === 0 ? (
                  <div className="w-full px-4 py-3 border border-yellow-300 bg-yellow-50 rounded-lg text-black text-sm">
                    No active subscriptions. Contact admin to get a subscription first.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedServiceForKey}
                      onChange={(e) => setSelectedServiceForKey(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-black"
                    >
                      <option value="">Select a service...</option>
                      {subscriptions
                        .filter(sub => sub.status === 'active')
                        .map(sub => (
                          <option key={sub.service_id} value={sub.service_id}>
                            {sub.service?.name || 'Service'} ({sub.credits_remaining} credits remaining)
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Enter API key name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-black"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={createApiKey}
                        disabled={!selectedServiceForKey || !newKeyName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateKey(false)
                          setNewKeyName('')
                          setSelectedServiceForKey('')
                        }}
                        className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-6">
              {apiKeys.length === 0 ? (
                <p className="text-black text-center py-8">
                  {subscriptions.filter(sub => sub.status === 'active').length === 0 
                    ? 'No active subscriptions. Contact admin to get a subscription first, then you can generate API keys.'
                    : 'No API keys yet. Click "Generate Key" above to create one for a subscribed service!'}
                </p>
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
                          {key.full_key ? (
                            <div className="mt-1">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all block text-black">
                                {key.full_key}
                              </code>
                            </div>
                          ) : (
                            <p className="text-sm text-black mt-1">
                              {key.key_prefix}... (Full key only shown once at creation)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const hasSubscription = subscriptions.some(
                sub => sub.service_id === service.id && sub.status === 'active'
              )
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
                  {hasSubscription ? (
                    <button
                      onClick={() => {
                        setSelectedServiceForKey(service.id)
                        setShowCreateKey(true)
                        setActiveTab('keys')
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Generate API Key
                    </button>
                  ) : (
                    <p className="w-full px-4 py-2 bg-gray-100 text-black rounded-lg text-center text-sm">
                      Contact admin to subscribe
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-black">My Subscriptions</h2>
            </div>
            <div className="p-6">
              {subscriptions.length === 0 ? (
                <p className="text-black text-center py-8">No active subscriptions. Contact admin to get a subscription.</p>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-black">{sub.service?.name || 'Service'}</h3>
                          <p className="text-sm text-black mt-1">
                            Credits: {(sub.credits_remaining || 0).toFixed(2)} / {(sub.credits_allocated || 0).toFixed(2)}
                          </p>
                          {sub.expires_at && (
                            <p className="text-xs text-black mt-1">
                              Expires: {new Date(sub.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${
                          sub.status === 'active' ? 'bg-green-100 text-black' : 'bg-gray-100 text-black'
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
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Credit Balance</h2>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Purchase Credits
              </button>
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
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-black">
                    <strong>Pricing:</strong> ₹1000 = 200 credits (1 credit = ₹5)
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

        {/* Purchase Credits Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-black">Purchase Credits</h3>
              <input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder="Enter amount (₹)"
                min="1000"
                step="1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-black"
              />
              {purchaseAmount && (
                <p className="text-sm text-black mb-4">
                  You will receive: {(parseFloat(purchaseAmount) * 0.2).toFixed(2)} credits
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={purchaseCredits}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Purchase
                </button>
                <button
                  onClick={() => {
                    setShowPurchaseModal(false)
                    setPurchaseAmount('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
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
