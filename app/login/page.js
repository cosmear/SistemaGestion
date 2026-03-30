import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="w-full h-full min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-0"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 animate-fade-in">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Faro
        </h2>
        <p className="mt-2 text-center text-sm text-gray-300">
          Desarrollado por Loopsmith · Iniciar sesión para acceder al panel de administración
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="bg-white/90 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
