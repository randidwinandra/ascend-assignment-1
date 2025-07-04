'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Shield, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { signInWithGoogle, getCurrentUser } from '@/lib/supabase/client'

export default function AdminLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        router.push('/admin')
        return
      }
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setInitializing(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      // The redirect will be handled by Supabase auth callback
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-survey-600"></div>
      </div>
    )
  }

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
        
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your surveys and analytics
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {/* Security Notice */}
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Admin Access Only
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This is a secure admin area. Only authorized StoryStream Studios 
                      team members can access this dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Sign In Button */}
            <div>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={`w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-survey-600 hover:bg-survey-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-survey-500 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                ) : (
                  <LogIn className="h-5 w-5 mr-3" />
                )}
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>

            {/* Features List */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Dashboard Features</span>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-survey-400 rounded-full mr-3"></div>
                  Create and manage flash surveys
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-survey-400 rounded-full mr-3"></div>
                  Real-time analytics and responses
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-survey-400 rounded-full mr-3"></div>
                  Public link generation and sharing
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-survey-400 rounded-full mr-3"></div>
                  Performance monitoring and limits
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Protected by Google OAuth 2.0 • Powered by Supabase
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Having trouble signing in? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  )
} 