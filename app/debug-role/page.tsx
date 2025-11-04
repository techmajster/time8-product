'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugRolePage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setMessage('Not logged in')
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, email, full_name')
        .eq('id', user.id)
        .single()

      if (error) {
        setMessage(`Error: ${error.message}`)
        setLoading(false)
        return
      }

      setUserRole(profile.role)
      setMessage(`Current role: ${profile.role}, Email: ${profile.email}`)
      setLoading(false)
    } catch (error) {
      setMessage(`Error: ${error}`)
      setLoading(false)
    }
  }

  const fixRole = async () => {
    try {
      setLoading(true)
      setMessage('Fixing role...')

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setMessage('Not logged in')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id)

      if (error) {
        setMessage(`Error fixing role: ${error.message}`)
        setLoading(false)
        return
      }

      setMessage('Role fixed! Refreshing...')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      setMessage(`Error: ${error}`)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="py-11">Loading...</div>
  }

  return (
    <div className="py-11 space-y-4">
      <h1 className="text-2xl font-bold">Debug Role Page</h1>
      <div className="p-4 bg-muted rounded">
        <p>{message}</p>
      </div>
      {userRole !== 'admin' && (
        <button 
          onClick={fixRole}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Fix Admin Role
        </button>
      )}
      <button 
        onClick={checkUserRole}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Refresh Role
      </button>
    </div>
  )
} 