'use client'

import { getCurrentUser, signInWithGoogle } from '@/lib/supabase/client'
import { LogIn, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { LoadingPage, Alert, BrandHeader, Button } from '@/components/ui'

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
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return <LoadingPage message="Checking authentication..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BrandHeader size="lg" />
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
            <Alert variant="info" title="Admin Access Only">
              This is a secure admin area. Only authorized StoryStream Studios 
              team members can access this dashboard.
            </Alert>

            <div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={loading}
                loading={loading}
                icon={LogIn}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">What you can do:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Create and manage surveys</li>
                <li>• Monitor response analytics</li>
                <li>• Generate public survey links</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Protected by Google OAuth 2.0 • Powered by Supabase
          </p>
          <p className="mt-2 text-xs text-gray-400">
            - Randi Dwi Nandra -
          </p>
        </div>
      </div>
    </div>
  )
} 