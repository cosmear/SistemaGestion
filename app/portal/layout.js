import PortalTopBar from './PortalTopBar';
import { requireClientSession } from '@/utils/auth/client';

export default async function PortalLayout({ children }) {
  const session = await requireClientSession();
  const clientName = session.clientName || 'Cliente';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PortalTopBar clientName={clientName} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
