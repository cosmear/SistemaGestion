'use client'

import { useState } from 'react'
import { SignIn } from '@phosphor-icons/react'

export default function LoginForm({ initialError = null }) {
  const [loading, setLoading] = useState(false)

  return (
    <form className="space-y-6" action="/api/auth/admin/login" method="post" onSubmit={() => setLoading(true)}>
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Usuario (Admin)
        </label>
        <div className="mt-1">
          <input
            id="username"
            name="username"
            type="text"
            required
            className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contrasena
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors sm:text-sm"
          />
        </div>
      </div>

      {initialError && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium animate-fade-in flex items-center gap-2">
          Error: {initialError}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors gap-2 items-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Ingresando...' : <>Entrar <SignIn weight="bold" className="text-lg" /></>}
        </button>
      </div>
    </form>
  )
}
