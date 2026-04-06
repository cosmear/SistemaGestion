import { requireAdminSession } from '@/utils/auth/admin';
import { getActiveInternalUsers } from '@/utils/internal-users';
import {
  canManageGoogleCalendar,
  getGoogleCalendarConnections,
  isGoogleCalendarConfigured,
} from '@/utils/google-calendar';
import { createClient } from '@/utils/supabase/server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage({ searchParams }) {
  const session = await requireAdminSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const internalUsers = await getActiveInternalUsers(supabase);
  const googleCalendarEnabled = isGoogleCalendarConfigured();
  const googleConnectionAllowed = googleCalendarEnabled && canManageGoogleCalendar(session);
  const googleConnections = googleConnectionAllowed
    ? await getGoogleCalendarConnections(supabase, session.userId)
    : [];

  return (
    <CalendarClient
      currentUserId={session.userId}
      googleCalendarEnabled={googleCalendarEnabled}
      googleConnectionAllowed={googleConnectionAllowed}
      googleConnections={googleConnections}
      googleStatus={resolvedSearchParams?.google || null}
      internalUsers={internalUsers}
    />
  );
}
