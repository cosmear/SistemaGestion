import { cookies } from 'next/headers';
import PortalTopBar from './PortalTopBar';

export default async function PortalLayout({ children }) {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('client_session')?.value;
  let clientName = 'Cliente';
  
  if (sessionStr) {
    try {
       const session = JSON.parse(sessionStr);
       clientName = session.clientName || 'Cliente';
    } catch(e) {}
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PortalTopBar clientName={clientName} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
