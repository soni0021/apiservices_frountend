'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Users, Activity, TrendingUp, LogOut, Search, Package, ShoppingCart, CreditCard, Plus, Edit, Trash2, Zap, Loader, Key, Check, Menu, X, Copy } from 'lucide-react'
import ApiTester from '../components/ApiTester'
import SearchableSelect from '../components/SearchableSelect'
import SearchableMultiSelect from '../components/SearchableMultiSelect'

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
  const [serviceSearchDropdownTerm, setServiceSearchDropdownTerm] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Loading states for different tabs
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false)
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  
  // Marketplace CRUD state
  const [showIndustryModal, setShowIndustryModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isSavingMarketplace, setIsSavingMarketplace] = useState(false)
  const [industryFormData, setIndustryFormData] = useState({ name: '', slug: '', description: '', is_active: true })
  const [categoryFormData, setCategoryFormData] = useState({ name: '', slug: '', description: '', is_active: true })
  const [serviceFormData, setServiceFormData] = useState({ 
    name: '', slug: '', description: '', category_id: '', endpoint_path: '', 
    price_per_call: '1.0', is_active: true, industry_ids: [] as string[]
  })
  
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
  
  // Service Access Management state
  const [selectedUserForAccess, setSelectedUserForAccess] = useState('')
  const [userServiceAccess, setUserServiceAccess] = useState<Record<string, any[]>>({})
  const [isLoadingServiceAccess, setIsLoadingServiceAccess] = useState(false)
  const [isGrantingAccess, setIsGrantingAccess] = useState(false)
  const [selectedServicesForGrant, setSelectedServicesForGrant] = useState<string[]>([])
  
  // User Management state
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [togglingStatusUserId, setTogglingStatusUserId] = useState<string | null>(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [newUserCredentials, setNewUserCredentials] = useState<{email: string, password: string} | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  const [editUserFormData, setEditUserFormData] = useState({
    email: '',
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
  const [newUserFormData, setNewUserFormData] = useState({
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
        if (parsedUser.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUser(parsedUser)
        await fetchData(token)
        setupWebSocket(token)
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
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to load marketplace: ${errorMessage}`)
    } finally {
      setIsLoadingMarketplace(false)
    }
  }
  
  // Marketplace CRUD functions
  const handleSaveIndustry = async () => {
    if (!industryFormData.name || !industryFormData.slug) {
      alert('Name and slug are required')
      return
    }
    
    setIsSavingMarketplace(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      if (editingIndustry) {
        await axios.put(`${apiUrl}/api/v1/admin/industries/${editingIndustry.id}`, industryFormData, { headers })
        alert('Industry updated successfully!')
      } else {
        await axios.post(`${apiUrl}/api/v1/admin/industries`, industryFormData, { headers })
        alert('Industry created successfully!')
      }
      
      setShowIndustryModal(false)
      setEditingIndustry(null)
      setIndustryFormData({ name: '', slug: '', description: '', is_active: true })
      fetchMarketplace()
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to save industry: ${errorMessage}`)
    } finally {
      setIsSavingMarketplace(false)
    }
  }
  
  const handleDeleteIndustry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this industry?')) return
    
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      await axios.delete(`${apiUrl}/api/v1/admin/industries/${id}`, { headers })
      alert('Industry deleted successfully!')
      fetchMarketplace()
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to delete industry: ${errorMessage}`)
    }
  }
  
  const handleSaveCategory = async () => {
    if (!categoryFormData.name || !categoryFormData.slug) {
      alert('Name and slug are required')
      return
    }
    
    setIsSavingMarketplace(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      if (editingCategory) {
        await axios.put(`${apiUrl}/api/v1/admin/categories/${editingCategory.id}`, categoryFormData, { headers })
        alert('Category updated successfully!')
      } else {
        await axios.post(`${apiUrl}/api/v1/admin/categories`, categoryFormData, { headers })
        alert('Category created successfully!')
      }
      
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryFormData({ name: '', slug: '', description: '', is_active: true })
      fetchMarketplace()
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to save category: ${errorMessage}`)
    } finally {
      setIsSavingMarketplace(false)
    }
  }
  
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      await axios.delete(`${apiUrl}/api/v1/admin/categories/${id}`, { headers })
      alert('Category deleted successfully!')
      fetchMarketplace()
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to delete category: ${errorMessage}`)
    }
  }
  
  const handleSaveService = async () => {
    if (!serviceFormData.name || !serviceFormData.slug || !serviceFormData.endpoint_path) {
      alert('Name, slug, and endpoint path are required')
      return
    }
    
    setIsSavingMarketplace(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      const payload = {
        ...serviceFormData,
        price_per_call: parseFloat(serviceFormData.price_per_call) || 1.0,
        category_id: serviceFormData.category_id || null,
        industry_ids: serviceFormData.industry_ids || []
      }
      
      if (editingService) {
        await axios.put(`${apiUrl}/api/v1/admin/services/${editingService.id}`, payload, { headers })
        alert('Service updated successfully!')
      } else {
        await axios.post(`${apiUrl}/api/v1/admin/services`, payload, { headers })
        alert('Service created successfully!')
      }
      
      setShowServiceModal(false)
      setEditingService(null)
      setServiceFormData({ 
        name: '', slug: '', description: '', category_id: '', endpoint_path: '', 
        price_per_call: '1.0', is_active: true, industry_ids: []
      })
      fetchMarketplace()
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to save service: ${errorMessage}`)
    } finally {
      setIsSavingMarketplace(false)
    }
  }
  
  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const headers = { Authorization: `Bearer ${token}` }
      
      await axios.delete(`${apiUrl}/api/v1/admin/services/${id}`, { headers })
      alert('Service deleted successfully!')
      fetchMarketplace()
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to delete service: ${errorMessage}`)
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
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err)
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to load subscriptions: ${errorMessage}`)
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
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err)
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to load transactions: ${errorMessage}`)
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
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to allocate credits: ${errorMessage}`)
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
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to update pricing: ${errorMessage}`)
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
  
  const fetchUserServiceAccess = async (userId: string) => {
    setIsLoadingServiceAccess(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      const response = await axios.get(`${apiUrl}/api/v1/admin/users/${userId}/service-access`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUserServiceAccess({ ...userServiceAccess, [userId]: response.data })
    } catch (err) {
      console.error('Failed to fetch user service access:', err)
      setUserServiceAccess({ ...userServiceAccess, [userId]: [] })
    } finally {
      setIsLoadingServiceAccess(false)
    }
  }
  
  const handleGrantServiceAccess = async () => {
    if (!selectedUserForAccess || selectedServicesForGrant.length === 0) {
      alert('Please select a user and at least one service')
      return
    }
    
    setIsGrantingAccess(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      const headers = { Authorization: `Bearer ${token}` }
      
      // Grant access to all selected services
      const grantPromises = selectedServicesForGrant.map(serviceId =>
        axios.post(
          `${apiUrl}/api/v1/admin/users/${selectedUserForAccess}/service-access`,
          { service_id: serviceId },
          { headers }
        ).catch(err => {
          // Return error info instead of throwing
          return { error: err.response?.data?.detail || 'Failed to grant access', serviceId } as any
        })
      )
      
      const results = await Promise.all(grantPromises)
      
      // Check for errors
      const errors = results.filter((r: any) => r.error)
      const successes = results.filter((r: any) => !r.error)
      
      // Refresh service access list
      await fetchUserServiceAccess(selectedUserForAccess)
      
      // Reset service selection
      setSelectedServicesForGrant([])
      
      if (errors.length > 0) {
        const errorMessages = errors.map(e => `Service ${e.serviceId}: ${e.error}`).join('\n')
        alert(`Granted access to ${successes.length} service(s). Errors:\n${errorMessages}`)
      } else {
        alert(`Successfully granted access to ${successes.length} service(s)!`)
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to grant service access: ${errorMessage}`)
    } finally {
      setIsGrantingAccess(false)
    }
  }
  
  const handleRevokeServiceAccess = async (userId: string, serviceId: string) => {
    if (!confirm('Are you sure you want to revoke this service access?')) return
    
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      await axios.delete(
        `${apiUrl}/api/v1/admin/users/${userId}/service-access/${serviceId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      // Refresh service access list
      await fetchUserServiceAccess(userId)
      
      alert('Service access revoked successfully!')
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to revoke service access: ${errorMessage}`)
    }
  }
  
  // Helper function to format error messages
  const formatErrorMessage = (error: any): string => {
    if (!error) return 'An unexpected error occurred'
    
    // Handle axios error response
    if (error.response?.data) {
      const data = error.response.data
      
      // Handle FastAPI validation errors
      if (Array.isArray(data.detail)) {
        return data.detail.map((err: any) => {
          const field = err.loc?.join('.') || 'field'
          const msg = err.msg || 'Invalid value'
          return `${field}: ${msg}`
        }).join(', ')
      }
      
      // Handle string error messages
      if (typeof data.detail === 'string') {
        return data.detail
      }
      
      // Handle object error messages
      if (typeof data.detail === 'object') {
        try {
          return JSON.stringify(data.detail)
        } catch {
          return 'Invalid data provided'
        }
      }
      
      // Handle message field
      if (data.message) {
        return data.message
      }
    }
    
    // Handle request errors
    if (error.request) {
      return 'Unable to connect to server. Please check your internet connection.'
    }
    
    // Handle other errors
    if (error.message) {
      return error.message
    }
    
    return 'Failed to create user. Please try again.'
  }

  const handleCreateUser = async () => {
    // Only email and password are required
    if (!newUserFormData.email || !newUserFormData.password) {
      alert('Email and password are required')
      return
    }
    
    if (newUserFormData.password.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    setIsCreatingUser(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      // Only send fields that have values
      const payload: any = {
        email: newUserFormData.email,
        password: newUserFormData.password
      }
      
      if (newUserFormData.full_name) payload.full_name = newUserFormData.full_name
      if (newUserFormData.phone) payload.phone = newUserFormData.phone
      if (newUserFormData.customer_name) payload.customer_name = newUserFormData.customer_name
      if (newUserFormData.phone_number) payload.phone_number = newUserFormData.phone_number
      if (newUserFormData.website_link) payload.website_link = newUserFormData.website_link
      if (newUserFormData.address) payload.address = newUserFormData.address
      if (newUserFormData.gst_number) payload.gst_number = newUserFormData.gst_number
      if (newUserFormData.msme_certificate) payload.msme_certificate = newUserFormData.msme_certificate
      if (newUserFormData.aadhar_number) payload.aadhar_number = newUserFormData.aadhar_number
      if (newUserFormData.pan_number) payload.pan_number = newUserFormData.pan_number
      if (newUserFormData.birthday) payload.birthday = newUserFormData.birthday
      if (newUserFormData.about_me) payload.about_me = newUserFormData.about_me
      
      const response = await axios.post(
        `${apiUrl}/api/v1/admin/users`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Store credentials to show in modal
      setNewUserCredentials({
        email: response.data.email,
        password: newUserFormData.password
      })
      
      // Reset form and close add user modal
      setNewUserFormData({
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
      setShowAddUserModal(false)
      
      // Show credentials modal
      setShowCredentialsModal(true)
      
      // Refresh users list
      const userToken = localStorage.getItem('access_token')
      if (userToken) {
        fetchData(userToken)
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(errorMessage)
    } finally {
      setIsCreatingUser(false)
    }
  }
  
  const handleEditUser = async (userId: string) => {
    setIsLoadingUserData(true)
    setEditingUserId(userId)
    setShowEditUserModal(true)
    
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      const response = await axios.get(
        `${apiUrl}/api/v1/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      const userData = response.data
      // Format birthday if it exists (convert from date string to YYYY-MM-DD format)
      let formattedBirthday = ''
      if (userData.birthday) {
        const date = new Date(userData.birthday)
        if (!isNaN(date.getTime())) {
          formattedBirthday = date.toISOString().split('T')[0]
        }
      }
      
      setEditUserFormData({
        email: userData.email || '',
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        customer_name: userData.customer_name || '',
        phone_number: userData.phone_number || '',
        website_link: userData.website_link || '',
        address: userData.address || '',
        gst_number: userData.gst_number || '',
        msme_certificate: userData.msme_certificate || '',
        aadhar_number: userData.aadhar_number || '',
        pan_number: userData.pan_number || '',
        birthday: formattedBirthday,
        about_me: userData.about_me || ''
      })
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to load user data: ${errorMessage}`)
      setShowEditUserModal(false)
      setEditingUserId(null)
    } finally {
      setIsLoadingUserData(false)
    }
  }
  
  const handleUpdateUser = async () => {
    if (!editingUserId) return
    
    setIsUpdatingUser(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      // Only send fields that have values
      const payload: any = {}
      
      if (editUserFormData.email) payload.email = editUserFormData.email
      if (editUserFormData.full_name) payload.full_name = editUserFormData.full_name
      if (editUserFormData.phone) payload.phone = editUserFormData.phone
      if (editUserFormData.customer_name) payload.customer_name = editUserFormData.customer_name
      if (editUserFormData.phone_number) payload.phone_number = editUserFormData.phone_number
      if (editUserFormData.website_link) payload.website_link = editUserFormData.website_link
      if (editUserFormData.address) payload.address = editUserFormData.address
      if (editUserFormData.gst_number) payload.gst_number = editUserFormData.gst_number
      if (editUserFormData.msme_certificate) payload.msme_certificate = editUserFormData.msme_certificate
      if (editUserFormData.aadhar_number) payload.aadhar_number = editUserFormData.aadhar_number
      if (editUserFormData.pan_number) payload.pan_number = editUserFormData.pan_number
      if (editUserFormData.birthday) payload.birthday = editUserFormData.birthday
      if (editUserFormData.about_me) payload.about_me = editUserFormData.about_me
      
      await axios.put(
        `${apiUrl}/api/v1/admin/users/${editingUserId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      alert('User updated successfully!')
      
      // Reset form and close modal
      setEditUserFormData({
        email: '',
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
      setEditingUserId(null)
      setIsLoadingUserData(false)
      setShowEditUserModal(false)
      
      // Refresh users list
      const userToken = localStorage.getItem('access_token')
      if (userToken) {
        fetchData(userToken)
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to update user: ${errorMessage}`)
    } finally {
      setIsUpdatingUser(false)
    }
  }
  
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone and will delete all associated data.`)) {
      return
    }
    
    setDeletingUserId(userId)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      await axios.delete(
        `${apiUrl}/api/v1/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      alert('User deleted successfully!')
      
      // Refresh users list
      const userToken = localStorage.getItem('access_token')
      if (userToken) {
        fetchData(userToken)
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to delete user: ${errorMessage}`)
    } finally {
      setDeletingUserId(null)
    }
  }
  
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'active' ? 'activate' : 'deactivate'
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return
    }
    
    setTogglingStatusUserId(userId)
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://apiservices-backend.onrender.com'
      
      await axios.put(
        `${apiUrl}/api/v1/admin/users/${userId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      alert(`User ${action}d successfully!`)
      
      // Refresh users list
      const userToken = localStorage.getItem('access_token')
      if (userToken) {
        fetchData(userToken)
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to ${action} user: ${errorMessage}`)
    } finally {
      setTogglingStatusUserId(null)
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
      const errorMessage = formatErrorMessage(err)
      alert(`Failed to create subscription: ${errorMessage}`)
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
      // Always fetch services and users when API Keys tab is active
      const token = localStorage.getItem('access_token')
      if (token) {
        // Always fetch services for this tab
        fetchMarketplace()
        // Ensure users are loaded
        if (users.length === 0) {
          fetchData(token)
        }
      }
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

  // Filter out admin users and apply search filter
  const filteredUsers = users
    .filter(u => u.role !== 'admin') // Hide admin users
    .filter(u =>
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-blue-600">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-gray-900 text-sm sm:text-base"
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
          <div className={`flex border-b overflow-x-auto ${mobileMenuOpen ? 'block lg:flex' : 'hidden lg:flex'}`}>
            <button
              onClick={() => {
                setActiveTab('overview')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-1 sm:mr-2" />
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('users')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1 sm:mr-2" />
              Users
            </button>
            <button
              onClick={() => {
                setActiveTab('marketplace')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'marketplace'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1 sm:mr-2" />
              Marketplace
            </button>
            <button
              onClick={() => {
                setActiveTab('subscriptions')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'subscriptions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1 sm:mr-2" />
              Subscriptions
            </button>
            <button
              onClick={() => {
                setActiveTab('transactions')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'transactions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-1 sm:mr-2" />
              Transactions
            </button>
            <button
              onClick={() => {
                setActiveTab('credits')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'credits'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1 sm:mr-2" />
              Credit Management
            </button>
            <button
              onClick={() => {
                setActiveTab('api-keys')
                if (services.length === 0) fetchMarketplace()
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'api-keys'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Key className="w-4 h-4 inline mr-1 sm:mr-2" />
              API Keys
            </button>
            <button
              onClick={() => {
                setActiveTab('testing')
                setMobileMenuOpen(false)
              }}
              className={`px-3 sm:px-6 py-3 font-medium whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'testing'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-1 sm:mr-2" />
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
                <button
                  onClick={() => setActiveTab('users')}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left w-full"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{realtimeStats.total_users}</p>
                  <p className="text-sm text-gray-500 mt-1">{realtimeStats.active_users} active</p>
                </button>
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
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    disabled={isCreatingUser}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[640px] sm:min-w-0">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Calls</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No users found</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{u.full_name || 'N/A'}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-none">{u.email}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {u.total_api_calls.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditUser(u.id)}
                              disabled={isLoadingUserData && editingUserId === u.id}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit user"
                            >
                              {isLoadingUserData && editingUserId === u.id ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : (
                                <Edit className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              disabled={togglingStatusUserId === u.id || u.role === 'admin'}
                              className={`px-2 py-1 text-xs rounded ${
                                u.status === 'active'
                                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={u.status === 'active' ? 'Deactivate user' : 'Activate user'}
                            >
                              {togglingStatusUserId === u.id ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : u.status === 'active' ? (
                                'Deactivate'
                              ) : (
                                'Activate'
                              )}
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={deletingUserId === u.id}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete user"
                              >
                                {deletingUserId === u.id ? (
                                  <Loader className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
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
                <button
                  onClick={() => {
                    setEditingIndustry(null)
                    setIndustryFormData({ name: '', slug: '', description: '', is_active: true })
                    setShowIndustryModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Industry
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {industries.map((ind) => (
                    <div key={ind.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{ind.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingIndustry(ind)
                              setIndustryFormData({
                                name: ind.name,
                                slug: ind.slug,
                                description: ind.description || '',
                                is_active: ind.is_active
                              })
                              setShowIndustryModal(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteIndustry(ind.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
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
                <button
                  onClick={() => {
                    setEditingCategory(null)
                    setCategoryFormData({ name: '', slug: '', description: '', is_active: true })
                    setShowCategoryModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{cat.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(cat)
                              setCategoryFormData({
                                name: cat.name,
                                slug: cat.slug,
                                description: cat.description || '',
                                is_active: cat.is_active
                              })
                              setShowCategoryModal(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
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
                <button
                  onClick={() => {
                    setEditingService(null)
                    setServiceFormData({ 
                      name: '', slug: '', description: '', category_id: '', endpoint_path: '', 
                      price_per_call: '1.0', is_active: true, industry_ids: []
                    })
                    setShowServiceModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((svc) => (
                    <div key={svc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{svc.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingService(svc)
                              setServiceFormData({
                                name: svc.name,
                                slug: svc.slug,
                                description: svc.description || '',
                                category_id: svc.category?.id || '',
                                endpoint_path: svc.endpoint_path || '',
                                price_per_call: svc.price_per_call?.toString() || '1.0',
                                is_active: svc.is_active,
                                industry_ids: []
                              })
                              setShowServiceModal(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(svc.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
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
              <div className="p-4 sm:p-6">
                {isLoadingSubscriptions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading subscriptions...</span>
                  </div>
                ) : subscriptions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No subscriptions found</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full min-w-[800px] sm:min-w-0">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Status</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Status</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subscriptions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-4">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">{sub.user_name || 'N/A'}</div>
                              <div className="text-xs sm:text-sm text-gray-500">{sub.user_email || 'N/A'}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                sub.user_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {sub.user_status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">{sub.service_name || 'N/A'}</div>
                              {sub.service_slug && (
                                <div className="text-xs text-gray-500">{sub.service_slug}</div>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                              {sub.credits_allocated?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                              {sub.credits_remaining?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'No expiry'}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold mb-4">Create Subscription</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                  <SearchableSelect
                    options={users
                      .filter(u => u.role === 'client')
                      .map(u => ({
                        value: u.id,
                        label: `${u.email} - ${u.full_name || 'No name'}`
                      }))}
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="Select a user..."
                    searchPlaceholder="Search users by email or name..."
                  />
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
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[640px] sm:min-w-0">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-4">
                            <div className="text-xs sm:text-sm text-gray-900">{txn.user_email || 'N/A'}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            ₹{txn.amount_paid?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {txn.credits_purchased?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              txn.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 
                              txn.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {txn.payment_status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
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
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-xl font-bold">Allocate Credits to User</h2>
                <p className="text-sm text-gray-600 mt-1">Add credits to user account with flexible pricing</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    <SearchableSelect
                      options={users
                        .filter(u => u.role === 'client')
                        .map(u => ({
                          value: u.id,
                          label: `${u.email} - ${u.full_name || 'No name'}`
                        }))}
                      value={creditAllocationUserId}
                      onChange={setCreditAllocationUserId}
                      placeholder="Select a user..."
                      searchPlaceholder="Search users by email or name..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-xl font-bold">Set User-Specific Pricing</h2>
                <p className="text-sm text-gray-600 mt-1">Customize per-credit pricing for individual users (Global default: ₹5 per credit)</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    <SearchableSelect
                      options={users
                        .filter(u => u.role === 'client')
                        .map(u => ({
                          value: u.id,
                          label: `${u.email} - ${u.full_name || 'No name'}`
                        }))}
                      value={pricingUserId}
                      onChange={(value) => {
                        setPricingUserId(value)
                        if (value) {
                          // Fetch credit info for the selected user
                          const fetchSelectedUserCreditInfo = async () => {
                            try {
                              const token = localStorage.getItem('access_token')
                              const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                                ? 'http://localhost:8000'
                                : 'https://apiservices-backend.onrender.com'
                              const headers = { Authorization: `Bearer ${token}` }
                              const response = await axios.get(`${apiUrl}/api/v1/admin/users/${value}/credits`, { headers })
                              setUserCreditInfo({ ...userCreditInfo, [value]: response.data })
                            } catch (err) {
                              console.error('Failed to fetch credit info:', err)
                            }
                          }
                          fetchSelectedUserCreditInfo()
                        }
                      }}
                      placeholder="Select a user..."
                      searchPlaceholder="Search users by email or name..."
                    />
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
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-xl font-bold">User Credit Information</h2>
              </div>
              <div className="p-4 sm:p-6">
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

        {/* Service Access Management Tab */}
        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Service Access Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Grant or revoke service access for users. Users can then generate their own API keys for services they have access to.
                </p>
              </div>
              
              {/* Grant Service Access Form */}
              <div className="p-3 sm:p-4 md:p-6 border-b bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">Grant Service Access</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    {users.length === 0 ? (
                      <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                        Loading users...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={users
                          .filter(u => u.role === 'client')
                          .map(u => ({
                            value: u.id,
                            label: `${u.email} - ${u.full_name || 'No name'}`
                          }))}
                        value={selectedUserForAccess}
                        onChange={(value) => {
                          setSelectedUserForAccess(value)
                          if (value) {
                            fetchUserServiceAccess(value)
                          }
                        }}
                        placeholder="Select a user..."
                        searchPlaceholder="Search users by email or name..."
                      />
                    )}
                    {users.length > 0 && users.filter(u => u.role === 'client').length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No client users found</p>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Services <span className="text-gray-500 text-xs">(Multiple selection allowed)</span>
                      </label>
                      {services.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedServicesForGrant.length === services.length) {
                              // Deselect all
                              setSelectedServicesForGrant([])
                            } else {
                              // Select all
                              setSelectedServicesForGrant(services.map(svc => svc.id))
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {selectedServicesForGrant.length === services.length ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    {services.length === 0 ? (
                      <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                        {isLoadingMarketplace ? 'Loading services...' : 'No services available'}
                      </div>
                    ) : (
                      <>
                        <SearchableMultiSelect
                          options={services.map(svc => ({
                            value: svc.id,
                            label: svc.name
                          }))}
                          selectedValues={selectedServicesForGrant}
                          onChange={setSelectedServicesForGrant}
                          placeholder="Select services..."
                          searchPlaceholder="Search services..."
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedServicesForGrant.length === services.length && services.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServicesForGrant(services.map(svc => svc.id))
                                } else {
                                  setSelectedServicesForGrant([])
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700 font-medium">
                              Select All Services ({services.length} total)
                            </span>
                          </label>
                        </div>
                      </>
                    )}
                    {selectedServicesForGrant.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedServicesForGrant.length} of {services.length} service(s) selected
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={handleGrantServiceAccess}
                    disabled={!selectedUserForAccess || selectedServicesForGrant.length === 0 || isGrantingAccess}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGrantingAccess ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Granting Access...
                      </>
                    ) : (
                      `Grant Access to ${selectedServicesForGrant.length > 0 ? `${selectedServicesForGrant.length} ` : ''}Service${selectedServicesForGrant.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                </div>
              </div>
              
              {/* User's Service Access List */}
              {selectedUserForAccess && (
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">User's Service Access</h3>
                  {isLoadingServiceAccess ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Loading service access...</span>
                    </div>
                  ) : userServiceAccess[selectedUserForAccess]?.length > 0 ? (
                    <div className="space-y-3">
                      {userServiceAccess[selectedUserForAccess].map((access: any) => (
                        <div key={access.id} className="border rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{access.service?.name || 'Service'}</h4>
                            {access.service?.description && (
                              <p className="text-sm text-gray-600 mt-1">{access.service.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Granted: {new Date(access.granted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeServiceAccess(selectedUserForAccess, access.service_id)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                          >
                            Revoke Access
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No service access granted yet</p>
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold">Add New User</h2>
                <button
                  onClick={() => {
                    setShowAddUserModal(false)
                    setNewUserFormData({
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
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Note:</strong> After creating the user, you'll receive their credentials. Share the email and password with the user. They can change their password after first login.
                </p>
                <p className="text-sm text-blue-900">
                  <strong>Important:</strong> New users are created as <strong>INACTIVE</strong> by default. You must activate them manually, or they will be automatically activated when payment is received (when you allocate credits with payment amount).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUserFormData.full_name}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserFormData.email}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newUserFormData.password}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">This will be the initial password. User can change it after login.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={newUserFormData.phone}
                  onChange={(e) => setNewUserFormData({ ...newUserFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="+1234567890"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information (Optional - can be filled later)</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.customer_name}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Company/Organization Name"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUserFormData.phone_number}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, phone_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website Link
                  </label>
                  <input
                    type="url"
                    value={newUserFormData.website_link}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, website_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={newUserFormData.address}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Complete address"
                    rows={3}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.gst_number}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, gst_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="GST Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MSME Certificate
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.msme_certificate}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, msme_certificate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="MSME Certificate Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.aadhar_number}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, aadhar_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Aadhaar Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.pan_number}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, pan_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="PAN Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={newUserFormData.birthday}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, birthday: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    About Me
                  </label>
                  <textarea
                    value={newUserFormData.about_me}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, about_me: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Additional information"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateUser}
                  disabled={isCreatingUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddUserModal(false)
                    setNewUserFormData({
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
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Credentials Modal */}
      {showCredentialsModal && newUserCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">User Created Successfully</h2>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false)
                    setNewUserCredentials(null)
                    setCopiedField(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">
                  <strong>Important:</strong> The user account is <strong>INACTIVE</strong>. You can activate it manually from the Users tab, or it will be automatically activated when payment is received (when allocating credits with payment amount).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUserCredentials.email}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newUserCredentials.email)
                        setCopiedField('email')
                        setTimeout(() => setCopiedField(null), 2000)
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUserCredentials.password}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newUserCredentials.password)
                        setCopiedField('password')
                        setTimeout(() => setCopiedField(null), 2000)
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      title="Copy Password"
                    >
                      {copiedField === 'password' ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => {
                      const credentials = `Email: ${newUserCredentials.email}\nPassword: ${newUserCredentials.password}`
                      navigator.clipboard.writeText(credentials)
                      setCopiedField('both')
                      setTimeout(() => setCopiedField(null), 2000)
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    {copiedField === 'both' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Both Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Both (Email & Password)
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Please share these credentials with the user. They can change their password after first login.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCredentialsModal(false)
                  setNewUserCredentials(null)
                  setCopiedField(null)
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Industry Modal */}
      {showIndustryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold">{editingIndustry ? 'Edit Industry' : 'Add Industry'}</h2>
                <button onClick={() => { setShowIndustryModal(false); setEditingIndustry(null) }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input type="text" value={industryFormData.name} onChange={(e) => setIndustryFormData({...industryFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                <input type="text" value={industryFormData.slug} onChange={(e) => setIndustryFormData({...industryFormData, slug: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={industryFormData.description} onChange={(e) => setIndustryFormData({...industryFormData, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" rows={3} />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={industryFormData.is_active} onChange={(e) => setIndustryFormData({...industryFormData, is_active: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSaveIndustry} disabled={isSavingMarketplace} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSavingMarketplace ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setShowIndustryModal(false); setEditingIndustry(null) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null) }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input type="text" value={categoryFormData.name} onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                <input type="text" value={categoryFormData.slug} onChange={(e) => setCategoryFormData({...categoryFormData, slug: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={categoryFormData.description} onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" rows={3} />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryFormData.is_active} onChange={(e) => setCategoryFormData({...categoryFormData, is_active: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSaveCategory} disabled={isSavingMarketplace} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSavingMarketplace ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold">{editingService ? 'Edit Service' : 'Add Service'}</h2>
                <button onClick={() => { setShowServiceModal(false); setEditingService(null) }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input type="text" value={serviceFormData.name} onChange={(e) => setServiceFormData({...serviceFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                <input type="text" value={serviceFormData.slug} onChange={(e) => setServiceFormData({...serviceFormData, slug: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint Path *</label>
                <input type="text" value={serviceFormData.endpoint_path} onChange={(e) => setServiceFormData({...serviceFormData, endpoint_path: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={serviceFormData.description} onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Call</label>
                  <input type="number" step="0.01" value={serviceFormData.price_per_call} onChange={(e) => setServiceFormData({...serviceFormData, price_per_call: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select value={serviceFormData.category_id} onChange={(e) => setServiceFormData({...serviceFormData, category_id: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900">
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={serviceFormData.is_active} onChange={(e) => setServiceFormData({...serviceFormData, is_active: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSaveService} disabled={isSavingMarketplace} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSavingMarketplace ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setShowServiceModal(false); setEditingService(null) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold">Edit User</h2>
                <button
                  onClick={() => {
                    setShowEditUserModal(false)
                    setEditingUserId(null)
                    setIsLoadingUserData(false)
                    setEditUserFormData({
                      email: '',
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
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isLoadingUserData}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {isLoadingUserData ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading user data...</p>
              </div>
            ) : (
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editUserFormData.email}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editUserFormData.full_name}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={editUserFormData.phone}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="+1234567890"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editUserFormData.customer_name}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Company/Organization Name"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editUserFormData.phone_number}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, phone_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website Link
                  </label>
                  <input
                    type="url"
                    value={editUserFormData.website_link}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, website_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={editUserFormData.address}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Complete address"
                    rows={3}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={editUserFormData.gst_number}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, gst_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="GST Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MSME Certificate
                  </label>
                  <input
                    type="text"
                    value={editUserFormData.msme_certificate}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, msme_certificate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="MSME Certificate Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={editUserFormData.aadhar_number}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, aadhar_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Aadhaar Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={editUserFormData.pan_number}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, pan_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="PAN Number"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={editUserFormData.birthday}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, birthday: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    About Me
                  </label>
                  <textarea
                    value={editUserFormData.about_me}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, about_me: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Additional information"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateUser}
                  disabled={isUpdatingUser || !editUserFormData.email}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdatingUser ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update User'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEditUserModal(false)
                    setEditingUserId(null)
                    setIsLoadingUserData(false)
                    setEditUserFormData({
                      email: '',
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
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={isUpdatingUser}
                >
                  Cancel
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
