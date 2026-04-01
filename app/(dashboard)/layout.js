import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { requireAdminSession } from '@/utils/auth/admin';

export default async function DashboardLayout({ children }) {
  const session = await requireAdminSession();
  const userName = session.fullName || session.username || 'Admin';
  const userRole = session.role || 'admin';

  return (
    <>
      <Sidebar userName={userName} userRole={userRole} />
      <main className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
        <Header userName={userName} userRole={userRole} />
        <div className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </div>
      </main>
    </>
  );
}
