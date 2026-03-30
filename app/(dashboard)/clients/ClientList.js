'use client';
import { useState } from 'react';
import { Plus, Trash, UserCircle, Tag, HandCoins, Key, Wrench } from '@phosphor-icons/react';
import { insertClient, updateClientStatus, setClientCredentials, deleteClientCredential } from '@/app/actions';

export default function ClientList({ initialClients, clientCredentials }) {
  const [clients, setClients] = useState(initialClients || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Credentials Management Modal State
  const [credModal, setCredModal] = useState({ open: false, client: null, currentCred: null });
  const [isCredSubmitting, setIsCredSubmitting] = useState(false);

  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  const packTypes = {
    '1': { name: 'Estandarizado #1', badge: 'pack-badge-1' },
    '2': { name: 'Estandarizado #2', badge: 'pack-badge-2' },
    '3': { name: 'Avanzado', badge: 'pack-badge-3' },
    'custom': { name: 'Pack Personalizado', badge: 'pack-badge-custom' },
    '0': { name: 'Sin Pack', badge: 'pack-badge-0' }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      pack_type: formData.get('pack_type'),
      pack_dev_fee: parseFloat(formData.get('pack_dev_fee')) || 0,
      pack_monthly_fee: parseFloat(formData.get('pack_monthly_fee')) || 0,
      website_url: formData.get('website_url') || null,
      phone_whatsapp: formData.get('phone_whatsapp') || null
    };

    const result = await insertClient(data);
    
    if (result.success) {
      // Reload UI state purely via server refresh for latest DB data
      window.location.reload();
    } else {
      alert('Error guardando el cliente.');
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id, currentStatus, name) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    await updateClientStatus(id, newStatus, name);
  };

  const openCredModal = (client) => {
    const existingCred = (clientCredentials || []).find(c => c.client_id === client.id);
    setCredModal({ open: true, client, currentCred: existingCred });
  };

  const handleSaveCredential = async (e) => {
    e.preventDefault();
    setIsCredSubmitting(true);
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    const result = await setClientCredentials(credModal.client.id, email, password);
    if(result.success) {
        window.location.reload();
    } else {
        alert("Error configurando las credenciales. Posible email duplicado.");
        setIsCredSubmitting(false);
    }
  };

  const handleDeleteCredential = async (clientId) => {
    if(confirm("¿Quitar acceso al Portal Web para este cliente?")) {
        await deleteClientCredential(clientId);
        window.location.reload();
    }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in block absolute inset-0">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
           <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Directorio de Clientes</h3>
           <p className="text-sm text-gray-500 font-medium">Gestiona marcas, packs y accesos al Portal B2B.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus weight="bold" /> Nuevo Cliente
        </button>
      </div>

      <div className="flex-1 overflow-x-auto bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] custom-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs border-b border-gray-100">
              <th className="py-4 px-6 font-bold">Cartera (Cliente)</th>
              <th className="py-4 px-4 font-bold">URLs & Redes</th>
              <th className="py-4 px-4 font-bold">Tipo de Pack</th>
              <th className="py-4 px-4 font-bold text-right">Fee Desarrollo</th>
              <th className="py-4 px-4 font-bold text-right">Mensualidad</th>
              <th className="py-4 px-4 text-center font-bold">Acceso a Portal</th>
              <th className="py-4 px-6 text-center font-bold">Estado / Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500 font-medium text-base">
                  No tienes clientes registrados aún. Carga la cartera inicial.
                </td>
              </tr>
            ) : (
              clients.map(client => {
                const cred = (clientCredentials || []).find(c => c.client_id === client.id);
                return (
                <tr key={client.id} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <UserCircle className="text-3xl text-brand-500 flex-shrink-0" weight="fill" />
                      <div>
                        <div className="font-bold text-gray-900 text-[15px]">{client.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 font-medium">Creado: {new Date(client.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                     {client.website_url ? <a href={client.website_url.startsWith('http') ? client.website_url : `https://${client.website_url}`} target="_blank" className="block text-xs text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded truncate max-w-[150px] mb-1">🔗 Web</a> : <span className="text-xs text-gray-400 block mb-1">Sin Web</span>}
                     {client.phone_whatsapp ? <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">WhatsApp ✅</span> : null}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg shadow-sm ${packTypes[client.pack_type]?.badge || packTypes['0'].badge}`}>
                      {packTypes[client.pack_type]?.name || 'P/D'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-gray-700">
                    {formatMoney(client.pack_dev_fee)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-brand-700">
                    {formatMoney(client.pack_monthly_fee)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button 
                       onClick={() => openCredModal(client)}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 justify-center mx-auto ${cred ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                       <Key weight={cred ? "fill" : "regular"} /> {cred ? 'Ver Accessos' : 'Dar Acceso'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => toggleStatus(client.id, client.status, client.name)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${client.status === 'active' ? 'bg-brand-500' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-sm ${client.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`block text-[10px] font-bold uppercase mt-1 ${client.status === 'active' ? 'text-brand-600' : 'text-gray-400'}`}>
                      {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              )}
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Cliente */}
      {showModal && (
         <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in custom-scrollbar max-h-[90vh] overflow-y-auto">
              {/* Header Pestaña */}
              <div className="p-6 border-b border-gray-100 bg-gray-50 relative">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Alta de Cliente Nuevo</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Ingresa los datos para registrar un cliente y auto-cargar su presupuesto si aplica.</p>
              </div>

              <form onSubmit={handleCreateClient} className="p-6 space-y-6">
                 {/* Datos Básicos */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-brand-600 uppercase tracking-widest border-b border-brand-100 pb-1">Identidad de Marca</h4>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre comercial</label>
                        <input type="text" name="name" required placeholder="Ej: Vorterix..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Website (URL)</label>
                          <input type="text" name="website_url" placeholder="ej: mipagina.com.ar" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Celular (Para Soporte)</label>
                          <input type="text" name="phone_whatsapp" placeholder="+54911..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm" />
                        </div>
                    </div>
                 </div>

                 {/* Paquete */}
                 <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-extrabold text-brand-600 uppercase tracking-widest border-b border-brand-100 pb-1">Asignación de Pack</h4>
                    
                    <div>
                      <select name="pack_type" required defaultValue="custom" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm font-bold text-gray-700 bg-gray-50">
                         <option value="1">Estandarizado #1</option>
                         <option value="2">Estandarizado #2</option>
                         <option value="3">Pack Avanzado</option>
                         <option value="custom">🛠️ Pack Personalizado (Recomendado)</option>
                         <option value="0">❌ Sin asignación de cobro</option>
                      </select>
                      <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">Si eliges "Pack Personalizado", las tarifas ingresadas debajo se añadirán automáticamente a los Ingresos de tu Vista de Presupuesto hasta fin de año.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5"><Wrench className="text-gray-400"/> Fee Setup/Desarrollo</label>
                          <div className="relative">
                            <span className="absolute left-4 top-2.5 text-gray-400 font-bold">$</span>
                            <input type="number" name="pack_dev_fee" defaultValue="0" className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm font-bold" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5"><HandCoins className="text-brand-500"/> Retainer Mensual</label>
                          <div className="relative">
                             <span className="absolute left-4 top-2.5 text-brand-500 font-bold">$</span>
                             <input type="number" name="pack_monthly_fee" defaultValue="0" className="w-full pl-8 pr-4 py-2.5 border border-brand-300 bg-brand-50 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm font-bold text-brand-800" />
                          </div>
                        </div>
                    </div>
                 </div>

                 {/* Botonera */}
                 <div className="pt-4 flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm rounded-xl hover:bg-gray-100 text-gray-600 font-bold transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm rounded-xl font-bold bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all disabled:opacity-50">Crear y Guardar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal Credenciales Cliente */}
      {credModal.open && credModal.client && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in border-t-4 border-indigo-600">
              <div className="p-6 border-b border-gray-100 bg-indigo-50/30">
                <h3 className="text-xl font-extrabold text-gray-900">Accesos Portal B2B</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Configura qué datos utilizará <b>{credModal.client.name}</b> para entrar a su portal de ayuda.</p>
              </div>

              <form onSubmit={handleSaveCredential} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Email de Ingreso</label>
                    <input type="email" name="email" required defaultValue={credModal.currentCred?.email || ''} placeholder="cliente@empresa.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Contraseña Maestra</label>
                    <input type="text" name="password" required defaultValue={credModal.currentCred?.password || ''} placeholder="Contaseña Temporal" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm" />
                 </div>

                 <div className="pt-6 flex flex-col gap-2">
                    <button type="submit" disabled={isCredSubmitting} className="w-full py-3 text-sm rounded-xl font-bold bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 items-center justify-center flex">
                      Guardar Credenciales
                    </button>
                    {credModal.currentCred && (
                       <button type="button" onClick={() => handleDeleteCredential(credModal.client.id)} className="w-full py-2.5 text-sm rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all mt-2">
                         Eliminar Acceso por Completo
                       </button>
                    )}
                    <button type="button" onClick={() => setCredModal({open: false, client: null})} className="w-full py-2.5 text-sm rounded-xl hover:bg-gray-100 text-gray-600 font-bold transition-colors mt-1">Cerrar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
