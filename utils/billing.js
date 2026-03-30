export function getCurrentPeriodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPeriodLabel(periodKey) {
  if (!periodKey || typeof periodKey !== 'string' || !periodKey.includes('-')) {
    return 'Periodo';
  }

  const [year, month] = periodKey.split('-').map(Number);
  const periodDate = new Date(year, (month || 1) - 1, 1);

  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(periodDate);
}

export function buildInvoiceTitle(clientName, periodKey) {
  return `Abono ${formatPeriodLabel(periodKey)} - ${clientName}`;
}

export function isInvoiceSettled(status) {
  return status === 'paid';
}

export function isInvoiceOpen(status) {
  return ['draft', 'pending', 'overdue'].includes(status);
}
