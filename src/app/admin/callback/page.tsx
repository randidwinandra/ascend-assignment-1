'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL parameters
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          // Successfully authenticated
          setStatus('success')
          
          // Redirect to admin dashboard after a brief success message
          setTimeout(() => {
            router.push('/admin')
          }, 2000)
        } else {
          // No session found
          throw new Error('No session found. Please try signing in again.')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setError(error instanceof Error ? error.message : 'Authentication failed')
        setStatus('error')
        
        // Redirect to login after showing error
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
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-survey-600 rounded-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Flash Survey</h1>
              <p className="text-sm text-gray-600">StoryStream Studios</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-survey-600 mx-auto"></div>
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  Completing Sign In
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we verify your authentication...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  Sign In Successful!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome to the Flash Survey admin dashboard. 
                  You'll be redirected automatically...
                </p>
                <div className="mt-4">
                  <div className="animate-pulse">
                    <div className="h-2 bg-survey-200 rounded-full">
                      <div className="h-2 bg-survey-600 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  Authentication Failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {error || 'An error occurred during sign in. Please try again.'}
                </p>
                <div className="mt-4">
                  <p className="text-xs text-gray-500">
                    Redirecting to login page...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  )
} 