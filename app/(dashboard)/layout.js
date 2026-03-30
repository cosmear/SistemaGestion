import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({ children }) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </div>
      </main>
    </>
  );
}
