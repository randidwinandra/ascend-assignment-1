'use client'

import { supabase } from '@/lib/supabase/client'
import { CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner, Alert, BrandHeader } from '@/components/ui'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          setStatus('success')
          setTimeout(() => {
            router.push('/admin')
          }, 2000)
        } else {
          throw new Error('No session found. Please try signing in again.')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setError(error instanceof Error ? error.message : 'Authentication failed')
        setStatus('error')
        
        setTimeout(() => {
          router.push('/admin/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BrandHeader size="lg" />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {status === 'loading' && (
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900">
                  Completing Sign In
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we verify your authentication...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900">
                  Sign In Successful!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome to the Flash Survey admin dashboard. 
                  You'll be redirected automatically...
                </p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 bg-survey-600 rounded-full animate-pulse" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <Alert variant="error" title="Authentication Failed" className="mb-4">
                  {error || 'An error occurred during sign in. Please try again.'}
                </Alert>
                <p className="text-xs text-gray-500">
                  Redirecting to login page...
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
} 