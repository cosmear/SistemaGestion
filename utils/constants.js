export const CLIENT_ONBOARDING_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'offboarded', label: 'Offboarding' },
];

export const TICKET_STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'waiting_client', label: 'Esperando cliente' },
  { value: 'resolved', label: 'Resuelto' },
];

export const TICKET_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
];

export const TICKET_CLASSIFICATION_OPTIONS = [
  { value: '', label: 'Sin clasificar' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Urgente', label: 'Urgente' },
  { value: 'Cambio de Contenido', label: 'Cambio de contenido' },
  { value: 'Facturacion', label: 'Facturacion' },
  { value: 'Mejora', label: 'Mejora' },
];

export const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagada' },
  { value: 'overdue', label: 'Vencida' },
];

export const DEFAULT_KANBAN_COLUMNS = [
  { title: 'To Do', position: 0 },
  { title: 'En Progreso', position: 1 },
  { title: 'Terminadas', position: 2 },
];

export function getTicketStatusMeta(status = 'new') {
  const map = {
    new: { label: 'Nuevo', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    in_progress: { label: 'En progreso', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    waiting_client: { label: 'Esperando cliente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    resolved: { label: 'Resuelto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return map[status] || map.new;
}

export function getTicketPriorityMeta(priority = 'medium') {
  const map = {
    low: { label: 'Baja', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    medium: { label: 'Media', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    high: { label: 'Alta', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    critical: { label: 'Critica', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return map[priority] || map.medium;
}

export function getInvoiceStatusMeta(status = 'draft') {
  const map = {
    draft: { label: 'Borrador', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    pending: { label: 'Pendiente', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    paid: { label: 'Pagada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    overdue: { label: 'Vencida', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return map[status] || map.draft;
}

export function getOnboardingMeta(status = 'pending') {
  const map = {
    pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    paused: { label: 'Pausado', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    offboarded: { label: 'Offboarding', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return map[status] || map.pending;
}
