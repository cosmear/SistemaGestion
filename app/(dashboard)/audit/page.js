import { createClient } from '@/utils/supabase/server';

export default async function AuditPage() {
  const supabase = await createClient();

  // Fetch data directly in the server component
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="animate-fade-in block">
      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold flex-1">Historial de Movimientos</h3>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-6 w-48">Fecha y Hora</th>
              <th className="py-3 px-6 w-32">Usuario</th>
              <th className="py-3 px-6">Acción Realizada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {error ? (
              <tr>
                <td colSpan="3" className="py-4 text-center text-red-500 font-medium">
                  Error cargando el historial: Asegúrate de haber ejecutado el SQL en Supabase para crear las tablas.
                </td>
              </tr>
            ) : (!logs || logs.length === 0) ? (
              <tr>
                <td colSpan="3" className="py-6 text-center text-gray-500">
                  No hay movimientos registrados.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 text-gray-500">
                    {new Date(log.created_at).toLocaleString('es-AR')}
                  </td>
                  <td className="py-3 px-6 font-medium text-gray-900 border-l border-r border-transparent">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      {log.user_name}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-gray-700">{log.action}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
