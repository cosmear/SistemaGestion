import { getAdminSession } from '@/utils/auth/admin';
import { getCalendarFeedEvents } from '@/utils/calendar-feed';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

function parseDate(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request) {
  const session = await getAdminSession();

  if (!session) {
    return Response.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const start = parseDate(request.nextUrl.searchParams.get('start'), defaultStart);
  const end = parseDate(request.nextUrl.searchParams.get('end'), defaultEnd);

  if (end.getTime() <= start.getTime()) {
    return Response.json(
      { error: 'El rango solicitado para la agenda es invalido.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const events = await getCalendarFeedEvents({
      supabase,
      session,
      start,
      end,
    });

    return Response.json({ events });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'No se pudo cargar la agenda corporativa.',
      },
      { status: 500 }
    );
  }
}
