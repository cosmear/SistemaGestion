import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const userName = cookieStore.get('session_user')?.value || 'Admin';

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
        <Header userName={userName} />
        <div className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </div>
      </main>
    </>
  );
}
