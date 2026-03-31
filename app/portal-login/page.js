import PortalLoginForm from './PortalLoginForm';
import { UserCircle } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default async function PortalLoginPage(props) {
  const searchParams = await props.searchParams;
  const initialError = searchParams?.error === 'invalid'
    ? 'Credenciales invalidas o usuario sin acceso.'
    : null;

  return (
    <div className="relative flex min-h-screen h-full w-full flex-col justify-center bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 z-0 bg-white/40 backdrop-blur-md" />

      <div className="z-10 flex animate-fade-in flex-col items-center text-center sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xl">
          <UserCircle weight="fill" className="text-4xl" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Faro Portal B2B
        </h2>
        <p className="mt-2 rounded-full bg-white/50 px-4 py-1 text-center text-sm font-bold text-gray-700 shadow-sm">
          Accede usando las credenciales provistas por la agencia
        </p>
      </div>

      <div className="z-10 mt-8 animate-fade-in sm:mx-auto sm:w-full sm:max-w-md" style={{ animationDelay: '100ms' }}>
        <div className="rounded-3xl border border-white bg-white/95 px-6 py-10 shadow-[0_20px_60px_rgba(0,0,0,0.1)] backdrop-blur-xl sm:px-10">
          <PortalLoginForm initialError={initialError} />
        </div>
      </div>
    </div>
  );
}
