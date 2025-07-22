'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Shield, Loader2, CheckCircle, ArrowLeft, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type CartItem = {
  dish: {
    id: string
    name: string
    price: number
    preparation_time: number
  }
  quantity: number
}

type CustomerInfo = {
  name: string
  phone: string
  tableNumber: string
  email: string
}

type CheckoutProps = {
  cart: CartItem[]
  restaurant: {
    id: string
    name: string
    slug: string
  }
  onClose: () => void
  onPlaceOrder: (customerInfo: CustomerInfo, user: User | null) => void
  getCartTotal: () => number
}

type AuthStep = 'email' | 'waiting' | 'details' | 'authenticated'

export default function Checkout({ 
  cart, 
  restaurant, 
  onClose, 
  onPlaceOrder, 
  getCartTotal 
}: CheckoutProps) {
  const [authStep, setAuthStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    tableNumber: '',
    email: ''
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Check for existing session and URL parameters on mount
  useEffect(() => {
    const checkAuthState = async () => {
      // Check if there's an email parameter in URL (from magic link redirect)
      const urlParams = new URLSearchParams(window.location.search)
      const emailFromUrl = urlParams.get('email')
      
      if (emailFromUrl) {
        setEmail(emailFromUrl)
        setAuthStep('waiting')
      }

      // Check current session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setCustomerInfo(prev => ({
          ...prev,
          email: session.user.email || emailFromUrl || ''
        }))
        setAuthStep('details')
      }
    }

    checkAuthState()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setCustomerInfo(prev => ({
            ...prev,
            email: session.user.email || ''
          }))
          setAuthStep('details')
          
          // Clean up URL parameters after successful auth
          const url = new URL(window.location.href)
          url.searchParams.delete('email')
          window.history.replaceState({}, '', url.toString())
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setAuthStep('email')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Check if user already exists and is signed in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser && currentUser.email === email) {
        // User is already authenticated with this email
        setUser(currentUser)
        setCustomerInfo(prev => ({ ...prev, email }))
        setAuthStep('details')
        return
      }

      // Send magic link to email
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(email)}`,
          data: {
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name
          }
        }
      })

      if (magicLinkError) {
        throw new Error(magicLinkError.message)
      }

      setMagicLinkSent(true)
      setAuthStep('waiting')
      setResendCooldown(60) // 60 second cooldown
      
    } catch (err) {
      console.error('Email submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleResendMagicLink = async () => {
    if (resendCooldown > 0) return

    setLoading(true)
    setError(null)

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(email)}`,
          data: {
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name
          }
        }
      })

      if (magicLinkError) {
        throw new Error(magicLinkError.message)
      }

      setResendCooldown(60)
      
    } catch (err) {
      console.error('Resend magic link error:', err)
      setError(err instanceof Error ? err.message : 'Failed to resend magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!customerInfo.name.trim() || !customerInfo.phone.trim() || !customerInfo.tableNumber.trim()) {
      setError('Please fill in all required fields')
      return
    }

    // Proceed with order placement
    onPlaceOrder(customerInfo, user)
  }

  const handleBack = () => {
    if (authStep === 'waiting') {
      setAuthStep('email')
      setMagicLinkSent(false)
      setError(null)
    } else if (authStep === 'details') {
      setAuthStep('email')
      setCustomerInfo({ name: '', phone: '', tableNumber: '', email: '' })
      setError(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-lg sm:rounded-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {(authStep === 'waiting' || authStep === 'details') && (
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="p-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold">
              {authStep === 'email' && 'Verify Email'}
              {authStep === 'waiting' && 'Check Your Email'}
              {authStep === 'details' && 'Order Details'}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {/* Email Step */}
          {authStep === 'email' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Verify Your Email</h3>
                <p className="text-gray-600 text-sm">
                  We'll send you a magic link to verify your email and confirm your order
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Magic Link...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Magic Link Waiting Step */}
          {authStep === 'waiting' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="relative">
                  <Mail className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
                <p className="text-gray-600 text-sm">
                  We've sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Click the link in your email to verify and continue with your order
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">What to do next:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Check your email inbox</li>
                      <li>2. Look for an email from Supabase</li>
                      <li>3. Click the "Confirm your email" link</li>
                      <li>4. You'll be redirected back here automatically</li>
                    </ol>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendMagicLink}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    'Resend Magic Link'
                  )}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  This page will automatically update once you click the link in your email
                </p>
              </div>
            </div>
          )}

          {/* Details Step */}
          {authStep === 'details' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Email Verified!</h3>
                <p className="text-gray-600 text-sm">
                  Please provide your details to complete the order
                </p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Your Name</Label>
                  <Input
                    id="customerName"
                    type="text"
                    placeholder="Enter your name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tableNumber">Table Number</Label>
                  <Input
                    id="tableNumber"
                    type="text"
                    placeholder="Enter table number"
                    value={customerInfo.tableNumber}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, tableNumber: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label>Email (Verified)</Label>
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-700">{email}</span>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Order Summary</h4>
                  {cart.map((item) => (
                    <div key={item.dish.id} className="flex justify-between text-sm mb-1">
                      <span>{item.dish.name} x{item.quantity}</span>
                      <div className="flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        <span>{(item.dish.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <div className="flex items-center text-green-600">
                      <IndianRupee className="w-4 h-4" />
                      <span>{getCartTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}