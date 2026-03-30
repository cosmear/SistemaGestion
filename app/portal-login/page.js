import PortalLoginForm from './PortalLoginForm';
import { UserCircle } from '@phosphor-icons/react/dist/ssr';

export default function PortalLoginPage() {
  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-0"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 animate-fade-in text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl mb-4">
           <UserCircle weight="fill" className="text-4xl" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Faro Portal B2B
        </h2>
        <p className="mt-2 text-center text-sm text-gray-700 font-bold bg-white/50 px-4 py-1 rounded-full shadow-sm">
          Accede usando las credenciales proveídas por la agencia
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="bg-white/95 backdrop-blur-xl py-10 px-6 shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-3xl sm:px-10 border border-white">
          <PortalLoginForm />
        </div>
      </div>
    </div>
  );
}
