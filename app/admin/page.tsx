'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Users, Activity, TrendingUp, LogOut, Search, Package, ShoppingCart, CreditCard, Plus, Edit, Trash2, Zap } from 'lucide-react'
import ApiTester from '../components/ApiTester'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  status: string
  created_at: string
  total_api_calls: number
}

interface Analytics {
  total_users: number
  active_users: number
  total_api_calls: number
  calls_today: number
  calls_this_month: number
  by_endpoint: Record<string, number>
  avg_response_time_ms: number
}

interface RealtimeStats {
  total_users: number
  active_users: number
  total_api_calls: number
  total_revenue: number
  total_credits_purchased: number
}

interface Industry {
  id: string
  name: string
  slug: string
  description: string
  is_active: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
  is_active: boolean
}

interface Service {
  id: string
  name: string
  slug: string
  description: string
  price_per_call: number
  is_active: boolean
  category?: Category
}

export default function AdminDashboard() {
  const router = useRouter()
  const wsRef = useRef<WebSocket | null>(null)
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [testApiKey, setTestApiKey] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'marketplace' | 'subscriptions' | 'transactions' | 'testing'>('overview')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [showCreateSubscription, setShowCreateSubscription] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [subscriptionCredits, setSubscriptionCredits] = useState('100')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    fetchData(token)
    setupWebSocket(token)
  }, [])

  const setupWebSocket = (token: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    
    try {
      const ws = new WebSocket(`${wsUrl}/ws/admin`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Admin WebSocket connected')
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
        setTimeout(() => setupWebSocket(token), 3000)
      }
    } catch (error) {
      console.error('Failed to setup WebSocket:', error)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'api_call':
      case 'user_registration':
      case 'credit_purchase':
      case 'subscription':
        // Refresh stats
        const token = localStorage.getItem('access_token')
        if (token) {
          fetchRealtimeStats(token)
          fetchData(token)
        }
        break
    }
  }

  const fetchData = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const headers = { Authorization: `Bearer ${token}` }

      const [usersRes, analyticsRes] = await Promise.all([
        axios.get(`${apiUrl}/api/v1/admin/users`, { headers }),
        axios.get(`${apiUrl}/api/v1/admin/analytics`, { headers })
      ])

      setUsers(usersRes.data)
      setAnalytics(analyticsRes.data)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRealtimeStats = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await axios.get(`${apiUrl}/api/v1/admin/realtime-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRealtimeStats(response.data)
    } catch (err) {
      console.error('Failed to fetch realtime stats:', err)
    }
  }

  const fetchMarketplace = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const headers = { Authorization: `Bearer ${token}` }

      const [industriesRes, categoriesRes, servicesRes] = await Promise.all([
        axios.get(`${apiUrl}/api/v1/admin/industries`, { headers }),
        axios.get(`${apiUrl}/api/v1/admin/categories`, { headers }),
        axios.get(`${apiUrl}/api/v1/admin/services`, { headers })
      ])

      setIndustries(industriesRes.data)
      setCategories(categoriesRes.data)
      setServices(servicesRes.data)
    } catch (err) {
      console.error('Failed to fetch marketplace data:', err)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await axios.get(`${apiUrl}/api/v1/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscriptions(response.data)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
    }
  }

  const createSubscription = async () => {
    if (!selectedUserId || !selectedServiceId || !subscriptionCredits) {
      alert('Please fill all fields')
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      await axios.post(
        `${apiUrl}/api/v1/admin/subscriptions`,
        {
          user_id: selectedUserId,
          service_id: selectedServiceId,
          credits_allocated: parseFloat(subscriptionCredits)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Subscription created successfully!')
      setShowCreateSubscription(false)
      setSelectedUserId('')
      setSelectedServiceId('')
      setSubscriptionCredits('100')
      fetchSubscriptions()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create subscription')
    }
  }

  useEffect(() => {
    if (activeTab === 'overview') {
      const token = localStorage.getItem('access_token')
      if (token) fetchRealtimeStats(token)
    } else     if (activeTab === 'marketplace') {
      fetchMarketplace()
    }
    if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    }
  }, [activeTab])

  const handleLogout = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
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
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'marketplace'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'subscriptions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('testing')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'testing'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              API Testing
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Real-time Stats */}
            {realtimeStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{realtimeStats.total_users}</p>
                  <p className="text-sm text-gray-500 mt-1">{realtimeStats.active_users} active</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    <h3 className="text-sm font-medium text-gray-600">Total API Calls</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{realtimeStats.total_api_calls.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">₹{realtimeStats.total_revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-orange-600" />
                    <h3 className="text-sm font-medium text-gray-600">Credits Purchased</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{realtimeStats.total_credits_purchased.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-medium text-gray-600">Avg Response</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{analytics?.avg_response_time_ms.toFixed(0) || 0}ms</p>
                </div>
              </div>
            )}

            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Calls Today</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.calls_today.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Calls This Month</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.calls_this_month.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Usage by Endpoint</h3>
                  <div className="mt-4 space-y-2">
                    {Object.entries(analytics.by_endpoint).slice(0, 5).map(([endpoint, count]) => (
                      <div key={endpoint} className="flex justify-between text-sm">
                        <code className="text-gray-700">{endpoint}</code>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Users</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{u.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {u.total_api_calls.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            {/* Industries */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Industries ({industries.length})</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {industries.map((ind) => (
                    <div key={ind.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold">{ind.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{ind.description}</p>
                      <span className={`mt-2 inline-block px-2 py-1 text-xs rounded ${
                        ind.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {ind.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Categories ({categories.length})</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{cat.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Services ({services.length})</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((svc) => (
                    <div key={svc.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold">{svc.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{svc.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-600">{svc.price_per_call} credit{svc.price_per_call !== 1 ? 's' : ''} per API call</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {svc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">All Subscriptions</h2>
                <button
                  onClick={() => setShowCreateSubscription(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Subscription
                </button>
              </div>
              <div className="p-6">
                {subscriptions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No subscriptions found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subscriptions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sub.user_email || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sub.service_name || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sub.credits_allocated}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sub.credits_remaining}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Subscription Modal */}
        {showCreateSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Create Subscription</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select a user</option>
                    {users.filter(u => u.role === 'client').map((u) => (
                      <option key={u.id} value={u.id}>{u.email} ({u.full_name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select a service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credits</label>
                  <input
                    type="number"
                    value={subscriptionCredits}
                    onChange={(e) => setSubscriptionCredits(e.target.value)}
                    min="1"
                    step="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="100"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={createSubscription}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateSubscription(false)
                    setSelectedUserId('')
                    setSelectedServiceId('')
                    setSubscriptionCredits('100')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">All Transactions</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Transaction history view - Fetch from API</p>
            </div>
          </div>
        )}

        {/* API Testing Tab */}
        {activeTab === 'testing' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">API Testing</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter an API key to test all available endpoints. You can use any active API key from any user.
              </p>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  placeholder="Enter API key (e.g., sk_live_...)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                {testApiKey && (
                  <button
                    onClick={() => setTestApiKey('')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              {!testApiKey && (
                <p className="text-xs text-gray-500 mt-2">
                  Example: Enter your API key (starts with sk_live_)
                </p>
              )}
            </div>

            {testApiKey ? (
              <ApiTester apiKey={testApiKey} />
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Enter an API key above to start testing</p>
                  <p className="text-sm text-gray-500">
                    You can use any active API key from the system to test endpoints
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
