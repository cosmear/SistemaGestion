'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignIn } from '@phosphor-icons/react'
import { loginClientPortal } from '@/app/portal-actions'

export default function PortalLoginForm() {
  const router = useRouter()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.target)
    const res = await loginClientPortal(formData)
    
    if (res.success) {
      router.push('/portal')
    } else {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-bold text-gray-700">
          Email Registrado
        </label>
        <div className="mt-1">
          <input
            name="email"
            type="email"
            required
            className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700">
          Contraseña Acceso
        </label>
        <div className="mt-1">
          <input
            name="password"
            type="password"
            required
            className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors sm:text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 font-bold animate-fade-in flex items-center gap-2 shadow-sm">
          ❌ {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_15px_rgba(21,128,61,0.3)] text-sm font-extrabold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 transition-all gap-2 items-center disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
        >
          {loading ? 'Entrando...' : <>Acceder a tu Panel <SignIn weight="bold" className="text-lg" /></>}
        </button>
      </div>
    </form>
  )
}
