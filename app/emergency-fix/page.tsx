'use client'

import { useState } from 'react'

export default function EmergencyFixPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const fixAdminAccess = async () => {
    setLoading(true)
    setResult('Fixing admin access...')

    try {
      const response = await fetch('/api/emergency-fix-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(`✅ Fixed! ${data.message}\n\nCurrent admins:\n${data.currentAdmins.map((admin: any) => `- ${admin.email} (${admin.role})`).join('\n')}`)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Network error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-red-600 mb-4">🚨 Emergency Admin Fix</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          This page will restore admin access for Szymon and Dajana.
        </p>
      </div>

      <button
        onClick={fixAdminAccess}
        disabled={loading}
        className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Fixing...' : '🚨 Fix Admin Access'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{result}</pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>After fixing, try logging in with:</p>
        <ul className="list-disc list-inside mt-2">
          <li>szymon.rajca@bb8.pl</li>
          <li>dajana.bieganowska@bb8.pl</li>
        </ul>
      </div>
    </div>
  )
} 