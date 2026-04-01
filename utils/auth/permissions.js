export const INTERNAL_ROLES = ['admin', 'manager', 'operator', 'employee'];

const LIMITED_STAFF_ROLES = new Set(['operator', 'employee']);

const SECTION_RULES = {
  dashboard: ['admin', 'manager'],
  clients: INTERNAL_ROLES,
  cashflow: ['admin', 'manager'],
  budget: ['admin', 'manager'],
  tasks: INTERNAL_ROLES,
  calendar: INTERNAL_ROLES,
  notes: INTERNAL_ROLES,
  tickets: ['admin', 'manager'],
  billing: ['admin', 'manager'],
  audit: ['admin', 'manager'],
  users: ['admin'],
};

function getRoleValue(sessionOrRole) {
  if (typeof sessionOrRole === 'string') {
    return normalizeInternalRole(sessionOrRole);
  }

  return normalizeInternalRole(sessionOrRole?.role);
}

export function normalizeInternalRole(role = 'admin') {
  const normalized = String(role || 'admin').trim().toLowerCase();
  return INTERNAL_ROLES.includes(normalized) ? normalized : 'admin';
}

export function isLimitedStaff(sessionOrRole) {
  return LIMITED_STAFF_ROLES.has(getRoleValue(sessionOrRole));
}

export function canAccessSection(sessionOrRole, section) {
  const role = getRoleValue(sessionOrRole);
  const allowedRoles = SECTION_RULES[section] || INTERNAL_ROLES;
  return allowedRoles.includes(role);
}

export function canViewClientPricing(sessionOrRole) {
  return !isLimitedStaff(sessionOrRole);
}

export function canManageClients(sessionOrRole) {
  const role = getRoleValue(sessionOrRole);
  return role === 'admin' || role === 'manager';
}

export function canManageUsers(sessionOrRole) {
  return canAccessSection(sessionOrRole, 'users');
}

export function canAccessTeamBoard(sessionOrRole) {
  return !isLimitedStaff(sessionOrRole);
}

export function isClientAssigned(session, clientId) {
  if (!clientId) {
    return false;
  }

  if (!isLimitedStaff(session)) {
    return true;
  }

  return Array.isArray(session?.assignedClientIds) && session.assignedClientIds.includes(clientId);
}

export function canAccessBoard(session, boardId) {
  const normalizedBoardId = String(boardId || '');

  if (!normalizedBoardId) {
    return false;
  }

  if (normalizedBoardId.startsWith('personal_')) {
    return normalizedBoardId === `personal_${session?.username || ''}`;
  }

  if (normalizedBoardId === 'team') {
    return canAccessTeamBoard(session);
  }

  if (normalizedBoardId.startsWith('client_')) {
    return isClientAssigned(session, normalizedBoardId.slice('client_'.length));
  }

  return !isLimitedStaff(session);
}

export function getDefaultInternalRoute(sessionOrRole) {
  if (canAccessSection(sessionOrRole, 'dashboard')) {
    return '/';
  }

  if (canAccessSection(sessionOrRole, 'calendar')) {
    return '/calendar';
  }

  if (canAccessSection(sessionOrRole, 'tasks')) {
    return '/tasks';
  }

  if (canAccessSection(sessionOrRole, 'clients')) {
    return '/clients';
  }

  return '/login';
}
