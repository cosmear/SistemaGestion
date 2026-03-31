'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { SignIn } from '@phosphor-icons/react'
import { loginClientPortal } from '@/app/portal-actions'

const INITIAL_STATE = { error: null }

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_15px_rgba(21,128,61,0.3)] text-sm font-extrabold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 transition-all gap-2 items-center disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
    >
      {pending ? 'Entrando...' : <>Acceder a tu panel <SignIn weight="bold" className="text-lg" /></>}
    </button>
  )
}

export default function PortalLoginForm() {
  const [state, formAction] = useActionState(loginClientPortal, INITIAL_STATE)

  return (
    <form className="space-y-6" action={formAction}>
      <div>
        <label className="block text-sm font-bold text-gray-700">
          Email registrado
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
          Contrasena de acceso
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

      {state?.error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 font-bold animate-fade-in flex items-center gap-2 shadow-sm">
          Error: {state.error}
        </div>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  )
}
