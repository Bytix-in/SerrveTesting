'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText,
  Eye,
  Calendar,
  IndianRupee,
  User as UserIcon,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  LogOut,
  ArrowLeft,
  ShoppingBag,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import InvoicePDFDownload from '@/components/InvoicePDFDownload'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Restaurant = {
  id: string
  name: string
  slug: string
}

type Order = {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  table_number: string
  items: any[]
  total_amount: number
  payment_status: string | null
  status: string
  created_at: string
}

type Invoice = {
  id: string
  order_id: string
  invoice_number: string
  total_amount: number
  payment_status: string
  created_at: string
}

export default function CustomerDashboard() {
  const params = useParams()
  const router = useRouter()
  const restaurantSlug = params.restaurant as string

  const [user, setUser] = useState<User | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [restaurantSlug])

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        setError('Authentication error')
        return
      }

      if (!session?.user) {
        console.log('No user session, redirecting to restaurant menu')
        router.push(`/${restaurantSlug}/menu`)
        return
      }

      setUser(session.user)

      // Fetch restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .eq('slug', restaurantSlug)
        .single()

      if (restaurantError || !restaurantData) {
        console.error('Restaurant error:', restaurantError)
        setError('Restaurant not found')
        return
      }

      setRestaurant(restaurantData)

      // Fetch user's orders for this restaurant
      await fetchOrders(session.user.id, restaurantData.id)

      // Fetch user's invoices for this restaurant
      await fetchInvoices(session.user.id, restaurantData.id)

    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async (userId: string, restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }

  const fetchInvoices = async (userId: string, restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invoices:', error)
        return
      }

      setInvoices(data || [])
    } catch (err) {
      console.error('Error fetching invoices:', err)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${restaurantSlug}/menu`)
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  const handleBackToMenu = () => {
    router.push(`/${restaurantSlug}/menu`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'paid':
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'paid':
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/api/invoice/${invoiceId}?format=html`, '_blank')
  }

  const getInvoiceForOrder = (orderId: string) => {
    return invoices.find(invoice => invoice.order_id === orderId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!user || !restaurant) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToMenu}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Menu
              </Button>
              <div className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                  <p className="text-gray-600">{restaurant.name}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome back!
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{orders.length} orders placed</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{invoices.length} invoices available</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                Member since {formatDate(user.created_at || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              Your Orders at {restaurant.name}
            </h2>
            <p className="text-gray-600 mt-1">
              View your order history and download invoices
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't placed any orders at {restaurant.name} yet
              </p>
              <Button
                onClick={handleBackToMenu}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Browse Menu
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => {
                const invoice = getInvoiceForOrder(order.id)
                return (
                  <div key={order.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Order #{order.id.slice(0, 8)}...
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.payment_status || order.status)}`}>
                            {getStatusIcon(order.payment_status || order.status)}
                            {order.payment_status || order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Table: {order.table_number}</span>
                          </div>
                          {order.customer_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{order.customer_phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 font-semibold text-green-600">
                            <IndianRupee className="w-4 h-4" />
                            <span>{formatCurrency(order.total_amount)}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                          <div className="text-sm text-gray-600">
                            {order.items.map((item: any, index: number) => (
                              <span key={index}>
                                {item.dish_name} x{item.quantity}
                                {index < order.items.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Invoice Actions */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        {invoice ? (
                          <>
                            <Button
                              onClick={() => handleViewInvoice(invoice.id)}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Invoice
                            </Button>
                            <InvoicePDFDownload
                              invoiceId={invoice.id}
                              invoiceNumber={invoice.invoice_number}
                              className="text-xs px-3 py-2 h-9"
                            />
                          </>
                        ) : (
                          <div className="text-sm text-gray-500 py-2">
                            {order.payment_status === 'SUCCESS' ?
                              'Invoice being generated...' :
                              'Invoice not available'
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{orders.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <IndianRupee className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Spent</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(orders.reduce((sum, order) => sum + order.total_amount, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Available Invoices</p>
                  <p className="text-2xl font-semibold text-gray-900">{invoices.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}