import { normalizeInternalRole } from '@/utils/auth/permissions';

export function getInternalUserDisplayName(user) {
  return user?.full_name || user?.fullName || user?.username || 'Sin nombre';
}

export function normalizeInternalUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    full_name: getInternalUserDisplayName(user),
    role: normalizeInternalRole(user.role),
    is_active: user.is_active !== false,
  };
}

export function buildUserClientMap(assignments = []) {
  return assignments.reduce((accumulator, assignment) => {
    if (!assignment?.user_id || !assignment?.client_id) {
      return accumulator;
    }

    if (!accumulator[assignment.user_id]) {
      accumulator[assignment.user_id] = [];
    }

    accumulator[assignment.user_id].push(assignment.client_id);
    return accumulator;
  }, {});
}

export async function getActiveInternalUsers(supabase) {
  const { data, error } = await supabase
    .from('internal_users')
    .select('id, username, full_name, role, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('username', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(normalizeInternalUser).filter(Boolean);
}

export async function getAllInternalUsers(supabase) {
  const { data, error } = await supabase
    .from('internal_users')
    .select('id, username, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(normalizeInternalUser).filter(Boolean);
}

export async function getInternalUserById(supabase, userId) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('internal_users')
    .select('id, username, full_name, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeInternalUser(data);
}

export async function getInternalUserAssignments(supabase, userIds = null) {
  let query = supabase
    .from('internal_user_clients')
    .select('user_id, client_id');

  if (Array.isArray(userIds) && userIds.length > 0) {
    query = query.in('user_id', userIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
