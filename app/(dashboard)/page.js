export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Placeholder for Stats */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Clientes Activos</p>
          <h3 className="text-3xl font-bold text-gray-900">0</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Ingresos del Mes</p>
          <h3 className="text-3xl font-bold text-green-600">$0.00</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Egresos del Mes</p>
          <h3 className="text-3xl font-bold text-red-600">$0.00</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center py-4">
              No hay actividad reciente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
