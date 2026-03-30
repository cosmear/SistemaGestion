'use client';
import { useState } from 'react';
import { Globe, WhatsappLogo, Receipt, Ticket, CheckCircle, WarningCircle, PaperPlaneRight, DownloadSimple } from '@phosphor-icons/react';
import { submitClientTicket } from '@/app/portal-actions';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PortalDashboardClient({ clientData, initialTickets }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  const website = clientData?.website_url 
     ? (clientData.website_url.startsWith('http') ? clientData.website_url : `https://${clientData.website_url}`) 
     : null;

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const currentMonthCapitalized = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const description = formData.get('description');
    
    const result = await submitClientTicket(title, description);
    
    if (result.success) {
      e.target.reset();
      router.refresh();
    } else {
      alert('Error enviando el ticket. Por favor contactanos por línea directa.');
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status) => {
    if (status === 'closed') return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200 shadow-sm flex items-center gap-1.5 w-fit"><CheckCircle weight="bold" /> Resuelto</span>;
    return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-orange-200 shadow-sm flex items-center gap-1.5 w-fit"><WarningCircle weight="bold" /> Pendiente</span>;
  };

  const handleDownloadPDF = async () => {
     setIsGeneratingPDF(true);
     try {
        const element = document.getElementById('receipt-template');
        element.style.display = 'block';
        element.style.position = 'absolute'; // para que no rompa el layout
        element.style.left = '-9999px';      // fuera de la pantalla
        
        const canvas = await html2canvas(element, { scale: 2 });
        element.style.display = 'none';

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Comprobante_Mensualidad_${currentMonth.replace(' ', '_')}.pdf`);
     } catch (err) {
        console.error("Error generating PDF:", err);
        alert("Hubo un error al generar el PDF.");
     }
     setIsGeneratingPDF(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Módulos Financiero y de Acción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Modulo URL */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center items-center text-center group cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]" onClick={() => website && window.open(website, '_blank')}>
           <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
             <Globe className="text-3xl" weight="bold" />
           </div>
           <h3 className="text-lg font-extrabold text-gray-900 leading-tight">Acceso Rápido a Web</h3>
           {website ? (
             <p className="text-sm font-bold text-gray-400 mt-2 truncate w-full px-4">{website}</p>
           ) : (
             <p className="text-sm font-bold text-red-400 mt-2 bg-red-50 py-1 px-3 rounded-md">Dominio no cargado todavía</p>
           )}
        </div>

        {/* Módulo Financiero (Rediseñado con PDF) */}
        <div className="bg-brand-600 rounded-3xl p-6 shadow-xl shadow-brand-200 border border-brand-500 flex flex-col justify-between items-center text-center text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-brand-500 rounded-full opacity-50"></div>
           <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-brand-700 rounded-full opacity-50"></div>
           
           <div className="z-10 w-full mb-3 flex flex-col items-center pt-2">
             <p className="text-xs text-brand-100 font-extrabold uppercase tracking-widest bg-brand-800/40 px-3 py-1 rounded-full border border-brand-500 mb-3 shadow-inner">
                Abono {currentMonthCapitalized}
             </p>
             <h3 className="text-4xl font-black tracking-tight drop-shadow-sm">{formatMoney(clientData.pack_monthly_fee)}</h3>
             <p className="text-sm text-brand-100 font-medium mt-1">Total adeudado del mes corriente</p>
           </div>
           
           <button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="z-10 w-full mt-auto py-3 bg-white hover:bg-gray-50 text-brand-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
           >
              {isGeneratingPDF ? 'Generando...' : <><DownloadSimple weight="bold" className="text-lg"/> Descargar Recibo</>}
           </button>
        </div>

        {/* WhatsApp Directo */}
        <a href="https://wa.me/5491128662553?text=Hola%20agencia,%20necesito%20soporte%20urgente" target="_blank" className="bg-[#25D366] rounded-3xl p-6 shadow-[0_8px_30px_rgba(37,211,102,0.3)] border border-[#20B958] flex flex-col justify-center items-center text-center hover:bg-[#20B958] transition-colors group relative overflow-hidden">
           <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
           <WhatsappLogo className="text-5xl text-white mb-3 group-hover:scale-110 transition-transform duration-300 relative z-10" weight="fill" />
           <h3 className="text-xl font-extrabold text-white leading-tight relative z-10">Línea Directa</h3>
           <p className="text-sm font-bold text-green-100 mt-1.5 uppercase tracking-wide relative z-10">Reporta emergencias ya</p>
        </a>
      </div>

      {/* 2. Tickets & Soporte */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-8">
         <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-24">
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-2">
               <Ticket className="text-brand-600" weight="fill" /> Abrir un Pedido
            </h3>
            <p className="text-sm text-gray-500 font-bold mb-6">¿Qué precisas que cambiemos o sumemos en tu plataforma?</p>

            <form onSubmit={handleSubmitTicket} className="space-y-5">
               <div>
                 <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Asunto Principal</label>
                 <input type="text" name="title" required placeholder="Ej: Nuevo producto para tienda..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
               </div>
               <div>
                 <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Detalles Adicionales</label>
                 <textarea name="description" required rows="4" placeholder="Explica detalladamente así podemos accionar rápido..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none text-sm font-medium transition-all resize-none"></textarea>
               </div>
               <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 mt-2">
                 Enviar Ticket Oficial <PaperPlaneRight weight="bold" className="text-lg" />
               </button>
            </form>
         </div>

         <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">Historial de Operaciones</h3>
               <span className="text-xs font-black uppercase tracking-widest bg-gray-200 text-gray-600 px-3 py-1 rounded-lg">
                 {initialTickets.length} Tickets
               </span>
            </div>

            {initialTickets.length === 0 ? (
               <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-4xl" weight="fill" />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Todo en orden</h4>
                  <p className="text-sm font-bold text-gray-400">Tus páginas funcionan perfecto. Cuando necesites algo, usa el panel lateral.</p>
               </div>
            ) : (
               initialTickets.map(ticket => (
                  <div key={ticket.id} className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow">
                     <div className="flex justify-between items-start mb-4">
                        <div className="pr-4">
                           <h4 className="text-lg font-extrabold text-gray-900 leading-tight mb-1">{ticket.title}</h4>
                           <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                        </div>
                        {getStatusBadge(ticket.status)}
                     </div>
                     <p className="text-sm text-gray-600 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100/50">
                        {ticket.description}
                     </p>
                  </div>
               ))
            )}
         </div>
      </div>

      {/* --- HIDDEN PDF TEMPLATE --- */}
      <div id="receipt-template" style={{ display: 'none', width: '800px', padding: '40px', backgroundColor: '#ffffff', color: '#111827', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#16a34a' }}>Loop Smith</h1>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Servicios Digitales y Desarrollo Web</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>RECIBO B2B</h2>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0', fontWeight: 'bold' }}>Período: {currentMonthCapitalized}</p>
              </div>
          </div>
          
          <div style={{ marginBottom: '40px' }}>
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Emitido Para:</p>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{clientData.name}</h3>
              <p style={{ fontSize: '14px', color: '#4b5563', margin: '4px 0 0 0' }}>{website || 'Sin Dominio Registrado'}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Descripción del Servicio</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Importe Mensual</th>
                  </tr>
              </thead>
              <tbody>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '24px 16px', fontSize: '16px', fontWeight: '600' }}>
                          Soporte, Mantenimiento y Retainer B2B <br/>
                          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'normal' }}>Correspondiente al mes de {currentMonth}</span>
                      </td>
                      <td style={{ padding: '24px 16px', textAlign: 'right', fontSize: '16px', fontWeight: '800' }}>{formatMoney(clientData.pack_monthly_fee)}</td>
                  </tr>
              </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px' }}>
             <div style={{ backgroundColor: '#f0fdf4', padding: '20px 40px', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'right' }}>
                 <p style={{ fontSize: '12px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Total Adeudado</p>
                 <p style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#14532d' }}>{formatMoney(clientData.pack_monthly_fee)}</p>
             </div>
          </div>
          
          <div style={{ marginTop: '60px', borderTop: '1px solid #e5e7eb', paddingTop: '20px', textAlign: 'center' }}>
             <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>Este documento es un comprobante de servicio generado digitalmente en el Portal B2B.</p>
          </div>
      </div>
    </div>
  );
}
