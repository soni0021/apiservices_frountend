'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Users, Activity, TrendingUp, LogOut, Search, Package, ShoppingCart, CreditCard, Plus, Edit, Trash2, Zap, Loader, Key, Check } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'marketplace' | 'subscriptions' | 'transactions' | 'credits' | 'api-keys' | 'testing'>('overview')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [showCreateSubscription, setShowCreateSubscription] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [subscriptionCredits, setSubscriptionCredits] = useState('100')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [serviceSearchDropdownTerm, setServiceSearchDropdownTerm] = useState('')
  
  // Loading states for different tabs
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false)
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  
  // Credit allocation form state
  const [creditAllocationUserId, setCreditAllocationUserId] = useState('')
  const [creditAllocationSearch, setCreditAllocationSearch] = useState('')
  const [creditsAmount, setCreditsAmount] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [allocationNotes, setAllocationNotes] = useState('')
  const [isAllocatingCredits, setIsAllocatingCredits] = useState(false)
  
  // Pricing form state
  const [pricingUserId, setPricingUserId] = useState('')
  const [pricePerCredit, setPricePerCredit] = useState('')
  const [isUpdatingPricing, setIsUpdatingPricing] = useState(false)
  
  // User credit info state
  const [userCreditInfo, setUserCreditInfo] = useState<Record<string, any>>({})
  const [isLoadingCreditInfo, setIsLoadingCreditInfo] = useState(false)
  
  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([])
  
  // API Key Generation state
  const [showGenerateApiKey, setShowGenerateApiKey] = useState(false)
  const [apiKeyUserId, setApiKeyUserId] = useState('')
  const [apiKeyUserSearch, setApiKeyUserSearch] = useState('')
  const [apiKeyName, setApiKeyName] = useState('')
  const [apiKeyServiceIds, setApiKeyServiceIds] = useState<string[]>([])
  const [apiKeyWhitelistUrls, setApiKeyWhitelistUrls] = useState<string[]>([''])
  const [apiKeyAllServices, setApiKeyAllServices] = useState(false)
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState<any>(null)
  const [userApiKeys, setUserApiKeys] = useState<Record<string, any[]>>({})
  const [isLoadingUserApiKeys, setIsLoadingUserApiKeys] = useState(false)

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
    const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://apiservices-backend.onrender.com'
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
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
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
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const response = await axios.get(`${apiUrl}/api/v1/admin/realtime-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRealtimeStats(response.data)
    } catch (err) {
      console.error('Failed to fetch realtime stats:', err)
    }
  }

  const fetchMarketplace = async () => {
    setIsLoadingMarketplace(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
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
    } finally {
      setIsLoadingMarketplace(false)
    }
  }

  const fetchSubscriptions = async () => {
    setIsLoadingSubscriptions(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const response = await axios.get(`${apiUrl}/api/v1/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscriptions(response.data)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
    } finally {
      setIsLoadingSubscriptions(false)
    }
  }
  
  const fetchTransactions = async () => {
    setIsLoadingTransactions(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const response = await axios.get(`${apiUrl}/api/v1/admin/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactions(response.data)
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
      setTransactions([])
    } finally {
      setIsLoadingTransactions(false)
    }
  }
  
  const allocateCredits = async () => {
    if (!creditAllocationUserId || !creditsAmount) {
      alert('Please select a user and enter credits amount')
      return
    }
    
    setIsAllocatingCredits(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      const response = await axios.post(
        `${apiUrl}/api/v1/admin/users/${creditAllocationUserId}/credits`,
        {
          credits_amount: parseFloat(creditsAmount),
          amount_paid: amountPaid ? parseFloat(amountPaid) : null,
          notes: allocationNotes || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      alert(`Successfully allocated ${creditsAmount} credits!`)
      // Reset form
      setCreditAllocationUserId('')
      setCreditsAmount('')
      setAmountPaid('')
      setAllocationNotes('')
      setCreditAllocationSearch('')
      
      // Refresh user data
      const userToken = localStorage.getItem('access_token')
      if (userToken) {
        fetchData(userToken)
        fetchUserCreditInfo()
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to allocate credits')
    } finally {
      setIsAllocatingCredits(false)
    }
  }
  
  const updateUserPricing = async () => {
    if (!pricingUserId || !pricePerCredit) {
      alert('Please select a user and enter price per credit')
      return
    }
    
    setIsUpdatingPricing(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      const response = await axios.put(
        `${apiUrl}/api/v1/admin/users/${pricingUserId}/pricing`,
        {
          price_per_credit: parseFloat(pricePerCredit)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      alert(`Successfully updated pricing to ₹${pricePerCredit} per credit!`)
      // Reset form
      setPricingUserId('')
      setPricePerCredit('')
      
      // Refresh user data
      const userToken = localStorage.getItem('access_token')
      if (userToken) {
        fetchData(userToken)
        fetchUserCreditInfo()
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update pricing')
    } finally {
      setIsUpdatingPricing(false)
    }
  }
  
  const fetchUserCreditInfo = async () => {
    setIsLoadingCreditInfo(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      // Fetch credit info for all client users
      const clientUsers = users.filter(u => u.role === 'client')
      const creditInfoPromises = clientUsers.map(user =>
        axios.get(`${apiUrl}/api/v1/admin/users/${user.id}/credits`, { headers })
          .then(res => ({ userId: user.id, data: res.data }))
          .catch(() => ({ userId: user.id, data: null }))
      )
      
      const results = await Promise.all(creditInfoPromises)
      const infoMap: Record<string, any> = {}
      results.forEach(({ userId, data }) => {
        if (data) infoMap[userId] = data
      })
      
      setUserCreditInfo(infoMap)
    } catch (err) {
      console.error('Failed to fetch credit info:', err)
    } finally {
      setIsLoadingCreditInfo(false)
    }
  }
  
  const fetchUserApiKeys = async (userId: string) => {
    setIsLoadingUserApiKeys(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const response = await axios.get(`${apiUrl}/api/v1/admin/users/${userId}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUserApiKeys({ ...userApiKeys, [userId]: response.data })
    } catch (err) {
      console.error('Failed to fetch user API keys:', err)
      setUserApiKeys({ ...userApiKeys, [userId]: [] })
    } finally {
      setIsLoadingUserApiKeys(false)
    }
  }
  
  const handleGenerateApiKey = async () => {
    if (!apiKeyUserId || !apiKeyName.trim() || (!apiKeyAllServices && apiKeyServiceIds.length === 0)) {
      alert('Please fill all required fields')
      return
    }
    
    setIsGeneratingApiKey(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      const whitelistUrls = apiKeyWhitelistUrls.filter(url => url.trim() !== '')
      
      const response = await axios.post(
        `${apiUrl}/api/v1/admin/api-keys/generate`,
        {
          user_id: apiKeyUserId,
          service_ids: apiKeyAllServices ? ['*'] : apiKeyServiceIds,
          name: apiKeyName,
          whitelist_urls: whitelistUrls.length > 0 ? whitelistUrls : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setGeneratedApiKey(response.data)
      
      // Refresh user's API keys list
      await fetchUserApiKeys(apiKeyUserId)
      
      // Reset form (but keep user selected)
      setApiKeyName('')
      setApiKeyServiceIds([])
      setApiKeyWhitelistUrls([''])
      setApiKeyAllServices(false)
      
      alert('API key generated successfully! Please save it now - it will only be shown once.')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate API key')
    } finally {
      setIsGeneratingApiKey(false)
    }
  }

  const createSubscription = async () => {
    if (!selectedUserId || !selectedServiceId || !subscriptionCredits) {
      alert('Please fill all fields')
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
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
    } else if (activeTab === 'marketplace') {
      fetchMarketplace()
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    } else if (activeTab === 'transactions') {
      fetchTransactions()
    } else if (activeTab === 'credits') {
      fetchUserCreditInfo()
    } else if (activeTab === 'api-keys') {
      if (services.length === 0) fetchMarketplace()
    }
  }, [activeTab, users])

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
              onClick={() => setActiveTab('credits')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'credits'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Credit Management
            </button>
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'api-keys'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Key className="w-4 h-4 inline mr-2" />
              API Keys
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
            {isLoadingMarketplace ? (
              <div className="bg-white rounded-lg shadow p-12">
                <div className="flex items-center justify-center">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading marketplace data...</span>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
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
                {isLoadingSubscriptions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading subscriptions...</span>
                  </div>
                ) : subscriptions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No subscriptions found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subscriptions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{sub.user_name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{sub.user_email || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                sub.user_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {sub.user_status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{sub.service_name || 'N/A'}</div>
                              {sub.service_slug && (
                                <div className="text-xs text-gray-500">{sub.service_slug}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sub.credits_allocated?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sub.credits_remaining?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'No expiry'}
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
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    size={6}
                  >
                    <option value="">Select a user</option>
                    {users
                      .filter(u => u.role === 'client')
                      .filter(u => {
                        if (!userSearchTerm) return true
                        const searchLower = userSearchTerm.toLowerCase()
                        return u.email.toLowerCase().includes(searchLower) || 
                               u.full_name?.toLowerCase().includes(searchLower)
                      })
                      .map((u) => (
                      <option key={u.id} value={u.id}>{u.email} ({u.full_name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={serviceSearchDropdownTerm}
                    onChange={(e) => setServiceSearchDropdownTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    size={5}
                  >
                    <option value="">Select a service</option>
                    {services
                      .filter(s => {
                        if (!serviceSearchDropdownTerm) return true
                        return s.name.toLowerCase().includes(serviceSearchDropdownTerm.toLowerCase())
                      })
                      .map((s) => (
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
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading transactions...</span>
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{txn.user_email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{txn.amount_paid?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {txn.credits_purchased?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              txn.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 
                              txn.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {txn.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Credit Management Tab */}
        {activeTab === 'credits' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Allocate Credits to User</h2>
                <p className="text-sm text-gray-600 mt-1">Add credits to user account with flexible pricing</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={creditAllocationSearch}
                      onChange={(e) => setCreditAllocationSearch(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                    <div className="relative">
                      <select 
                        value={creditAllocationUserId}
                        onChange={(e) => {
                          setCreditAllocationUserId(e.target.value)
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 appearance-none bg-white cursor-pointer pr-8"
                      >
                        <option value="">Select a user...</option>
                        {users
                          .filter(u => u.role === 'client')
                          .filter(u => {
                            if (!creditAllocationSearch) return true
                            const searchLower = creditAllocationSearch.toLowerCase()
                            return u.email.toLowerCase().includes(searchLower) || 
                                   u.full_name?.toLowerCase().includes(searchLower)
                          })
                          .map((u) => (
                            <option key={u.id} value={u.id}>{u.email} - {u.full_name}</option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Credits Amount</label>
                      <input
                        type="number"
                        placeholder="100"
                        min="1"
                        step="1"
                        value={creditsAmount}
                        onChange={(e) => setCreditsAmount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid (₹)</label>
                      <input
                        type="number"
                        placeholder="500"
                        min="0"
                        step="1"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      placeholder="Enter any notes about this credit allocation..."
                      rows={3}
                      value={allocationNotes}
                      onChange={(e) => setAllocationNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <button 
                    onClick={allocateCredits}
                    disabled={isAllocatingCredits || !creditAllocationUserId || !creditsAmount}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAllocatingCredits ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Allocating...
                      </>
                    ) : (
                      'Allocate Credits'
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Set User-Specific Pricing</h2>
                <p className="text-sm text-gray-600 mt-1">Customize per-credit pricing for individual users (Global default: ₹5 per credit)</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    <div className="relative">
                      <select 
                        value={pricingUserId}
                        onChange={(e) => {
                          e.preventDefault()
                          setPricingUserId(e.target.value)
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 appearance-none bg-white cursor-pointer"
                      >
                        <option value="">Select a user...</option>
                        {users.filter(u => u.role === 'client').map((u) => (
                          <option key={u.id} value={u.id}>{u.email} - {u.full_name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Credit (₹)</label>
                    <input
                      type="number"
                      placeholder="5.00"
                      min="0.01"
                      step="0.01"
                      value={pricePerCredit}
                      onChange={(e) => setPricePerCredit(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default global pricing: ₹5.00 per credit</p>
                  </div>
                  <button 
                    onClick={updateUserPricing}
                    disabled={isUpdatingPricing || !pricingUserId || !pricePerCredit}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdatingPricing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update User Pricing'
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">User Credit Information</h2>
              </div>
              <div className="p-6">
                {isLoadingCreditInfo ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading credit information...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.filter(u => u.role === 'client').map((u) => {
                      const creditInfo = userCreditInfo[u.id]
                      return (
                        <div key={u.id} className="border rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900">{u.full_name}</h3>
                          <p className="text-sm text-gray-600">{u.email}</p>
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-gray-500">
                              Total Credits: <span className="font-semibold">{creditInfo?.total_credits?.toFixed(2) || '0.00'}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Used: <span className="font-semibold">{creditInfo?.credits_used?.toFixed(2) || '0.00'}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Remaining: <span className="font-semibold">{creditInfo?.credits_remaining?.toFixed(2) || '0.00'}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Price/Credit: <span className="font-semibold">₹{creditInfo?.price_per_credit?.toFixed(2) || '5.00'}</span>
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* API Key Management Tab */}
        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Generate API Key for User</h2>
                <button
                  onClick={() => {
                    setShowGenerateApiKey(true)
                    if (services.length === 0) fetchMarketplace()
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Generate API Key
                </button>
              </div>
              
              {showGenerateApiKey && (
                <div className="p-6 border-b bg-gray-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={apiKeyUserSearch}
                        onChange={(e) => setApiKeyUserSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                      <div className="relative">
                        <select
                          value={apiKeyUserId}
                          onChange={(e) => {
                            setApiKeyUserId(e.target.value)
                            if (e.target.value) {
                              fetchUserApiKeys(e.target.value)
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 appearance-none bg-white cursor-pointer pr-8"
                        >
                          <option value="">Select a user...</option>
                          {users
                            .filter(u => u.role === 'client')
                            .filter(u => {
                              if (!apiKeyUserSearch) return true
                              const searchLower = apiKeyUserSearch.toLowerCase()
                              return u.email.toLowerCase().includes(searchLower) || 
                                     u.full_name?.toLowerCase().includes(searchLower)
                            })
                            .map((u) => (
                              <option key={u.id} value={u.id}>{u.email} - {u.full_name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key Name</label>
                      <input
                        type="text"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                        placeholder="e.g., Production Key, Test Key"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={apiKeyAllServices}
                          onChange={(e) => {
                            setApiKeyAllServices(e.target.checked)
                            if (e.target.checked) {
                              setApiKeyServiceIds(['*'])
                            } else {
                              setApiKeyServiceIds([])
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700">Grant access to ALL services</span>
                      </label>
                    </div>
                    
                    {!apiKeyAllServices && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Services</label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                          {services.map((svc) => (
                            <label key={svc.id} className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={apiKeyServiceIds.includes(svc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setApiKeyServiceIds([...apiKeyServiceIds, svc.id])
                                  } else {
                                    setApiKeyServiceIds(apiKeyServiceIds.filter(id => id !== svc.id))
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-900">{svc.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Whitelist URLs (Security) - Optional
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Only allow API requests from these URLs. Leave empty to allow all origins.
                      </p>
                      {apiKeyWhitelistUrls.map((url, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => {
                              const newUrls = [...apiKeyWhitelistUrls]
                              newUrls[index] = e.target.value
                              setApiKeyWhitelistUrls(newUrls)
                            }}
                            placeholder="https://example.com"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                          {apiKeyWhitelistUrls.length > 1 && (
                            <button
                              onClick={() => {
                                setApiKeyWhitelistUrls(apiKeyWhitelistUrls.filter((_, i) => i !== index))
                              }}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setApiKeyWhitelistUrls([...apiKeyWhitelistUrls, ''])}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add URL
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateApiKey}
                        disabled={!apiKeyUserId || !apiKeyName.trim() || (!apiKeyAllServices && apiKeyServiceIds.length === 0) || isGeneratingApiKey}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGeneratingApiKey ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate API Key'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowGenerateApiKey(false)
                          setApiKeyUserId('')
                          setApiKeyName('')
                          setApiKeyServiceIds([])
                          setApiKeyWhitelistUrls([''])
                          setApiKeyAllServices(false)
                          setApiKeyUserSearch('')
                          setGeneratedApiKey(null)
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {generatedApiKey && (
                <div className="p-6 border-b bg-green-50">
                  <div className="flex items-start gap-3 mb-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 mb-2">API Key Generated Successfully!</p>
                      <p className="text-sm text-green-700 mb-3">
                        ⚠️ <strong>Save this key now</strong> - it will only be shown once!
                      </p>
                      <div className="bg-white border border-green-200 rounded-lg p-4 mb-3">
                        <code className="text-sm text-gray-900 break-all">{generatedApiKey.full_key}</code>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedApiKey.full_key)
                          alert('API key copied to clipboard!')
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Copy API Key
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {apiKeyUserId && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">User's API Keys</h3>
                  {isLoadingUserApiKeys ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading API keys...</span>
                    </div>
                  ) : userApiKeys[apiKeyUserId]?.length > 0 ? (
                    <div className="space-y-3">
                      {userApiKeys[apiKeyUserId].map((key: any) => (
                        <div key={key.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{key.name}</h4>
                              <p className="text-sm text-gray-600">{key.key_prefix}...</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {key.status}
                            </span>
                          </div>
                          {key.allowed_services && (
                            <p className="text-xs text-gray-500 mt-1">
                              Services: {key.allowed_services.includes('*') ? 'All Services' : key.allowed_services.join(', ')}
                            </p>
                          )}
                          {key.whitelist_urls && key.whitelist_urls.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Whitelisted: {key.whitelist_urls.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No API keys for this user yet</p>
                  )}
                </div>
              )}
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
