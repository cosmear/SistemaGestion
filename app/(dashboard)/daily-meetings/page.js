import { createClient } from '@/utils/supabase/server';
import { requireAdminSession } from '@/utils/auth/admin';
import { getExecutionContext } from '@/utils/execution-data';
import DailyMeetingsClient from './DailyMeetingsClient';

function mapIdsByEntity(rows = [], entityKey, valueKey) {
  return rows.reduce((accumulator, row) => {
    const entityId = row?.[entityKey];
    const valueId = row?.[valueKey];

    if (!entityId || !valueId) {
      return accumulator;
    }

    if (!accumulator[entityId]) {
      accumulator[entityId] = [];
    }

    accumulator[entityId].push(valueId);
    return accumulator;
  }, {});
}

export default async function DailyMeetingsPage(props) {
  const session = await requireAdminSession();
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  let pageError = null;
  let payload = {
    meetings: [],
    monthlyGoals: [],
    tasks: [],
    internalUsers: [],
    boardOptions: [],
    selectedMeetingId: null,
  };

  try {
    const [
      context,
      meetingsResult,
      participantsResult,
      taskLinksResult,
      goalLinksResult,
      monthlyGoalsResult,
    ] = await Promise.all([
      getExecutionContext(supabase, session),
      supabase.from('daily_meetings').select('*').order('meeting_date', { ascending: false }),
      supabase.from('daily_meeting_participants').select('daily_meeting_id, user_id'),
      supabase.from('daily_meeting_tasks').select('daily_meeting_id, task_id'),
      supabase.from('daily_meeting_monthly_goals').select('daily_meeting_id, monthly_goal_id'),
      supabase.from('monthly_goals').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
    ]);

    if (meetingsResult.error || participantsResult.error || taskLinksResult.error || goalLinksResult.error || monthlyGoalsResult.error) {
      pageError = 'Error cargando reuniones diarias. Ejecuta el SQL nuevo y vuelve a intentar.';
    } else {
      const participantMap = mapIdsByEntity(participantsResult.data, 'daily_meeting_id', 'user_id');
      const taskLinkMap = mapIdsByEntity(taskLinksResult.data, 'daily_meeting_id', 'task_id');
      const goalLinkMap = mapIdsByEntity(goalLinksResult.data, 'daily_meeting_id', 'monthly_goal_id');
      const taskMap = Object.fromEntries(context.tasks.map((task) => [task.id, task]));
      const monthlyGoalMap = Object.fromEntries((monthlyGoalsResult.data || []).map((goal) => [goal.id, goal]));
      const meetings = (meetingsResult.data || []).map((meeting) => ({
        ...meeting,
        participant_ids: participantMap[meeting.id] || [],
        linked_tasks: (taskLinkMap[meeting.id] || []).map((taskId) => taskMap[taskId]).filter(Boolean),
        monthly_goal_ids: goalLinkMap[meeting.id] || [],
        linked_goals: (goalLinkMap[meeting.id] || []).map((goalId) => monthlyGoalMap[goalId]).filter(Boolean),
      }));
      const todayKey = new Date().toISOString().slice(0, 10);
      const selectedMeetingId = meetings.find((meeting) => meeting.id === searchParams?.meeting)?.id
        || meetings.find((meeting) => meeting.meeting_date === todayKey)?.id
        || meetings[0]?.id
        || null;

      payload = {
        meetings,
        monthlyGoals: monthlyGoalsResult.data || [],
        tasks: context.tasks,
        internalUsers: context.internalUsers,
        boardOptions: context.boardOptions,
        selectedMeetingId,
      };
    }
  } catch (error) {
    pageError = error.message || 'Error cargando reuniones diarias. Ejecuta el SQL nuevo y vuelve a intentar.';
  }

  if (pageError) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        {pageError}
      </div>
    );
  }

  return (
    <DailyMeetingsClient
      initialMeetings={payload.meetings}
      monthlyGoals={payload.monthlyGoals}
      availableTasks={payload.tasks}
      internalUsers={payload.internalUsers}
      boardOptions={payload.boardOptions}
      selectedMeetingId={payload.selectedMeetingId}
    />
  );
}
