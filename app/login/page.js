import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage(props) {
  const searchParams = await props.searchParams;
  const initialError = searchParams?.error === 'invalid'
    ? 'Credenciales incorrectas o usuario inactivo.'
    : null;

  return (
    <div className="relative flex min-h-screen h-full w-full flex-col justify-center bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 z-0 bg-gray-900/60 backdrop-blur-sm" />

      <div className="z-10 animate-fade-in sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Faro
        </h2>
        <p className="mt-2 text-center text-sm text-gray-300">
          Desarrollado por Loopsmith · Iniciar sesión para acceder al panel de administración
        </p>
      </div>

      <div className="z-10 mt-8 animate-fade-in sm:mx-auto sm:w-full sm:max-w-md" style={{ animationDelay: '100ms' }}>
        <div className="border border-white/20 bg-white/90 px-4 py-8 shadow-2xl backdrop-blur-md sm:rounded-2xl sm:px-10">
          <LoginForm initialError={initialError} />
        </div>
      </div>
    </div>
  );
}
