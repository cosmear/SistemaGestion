import { createClient } from '@/utils/supabase/server';
import { requireAdminSession } from '@/utils/auth/admin';
import { getExecutionContext } from '@/utils/execution-data';
import CommunicationClient from './CommunicationClient';

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

export default async function CommunicationPage(props) {
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
      responsiblesResult,
      taskLinksResult,
      goalLinksResult,
      monthlyGoalsResult,
    ] = await Promise.all([
      getExecutionContext(supabase, session),
      supabase.from('communication_meetings').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
      supabase.from('communication_meeting_responsibles').select('communication_meeting_id, user_id'),
      supabase.from('communication_meeting_tasks').select('communication_meeting_id, task_id'),
      supabase.from('communication_meeting_monthly_goals').select('communication_meeting_id, monthly_goal_id'),
      supabase.from('monthly_goals').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
    ]);

    if (meetingsResult.error || responsiblesResult.error || taskLinksResult.error || goalLinksResult.error || monthlyGoalsResult.error) {
      pageError = 'Error cargando reuniones mensuales de comunicacion. Ejecuta el SQL nuevo y vuelve a intentar.';
    } else {
      const responsibleMap = mapIdsByEntity(responsiblesResult.data, 'communication_meeting_id', 'user_id');
      const taskMap = Object.fromEntries(context.tasks.map((task) => [task.id, task]));
      const taskLinkMap = mapIdsByEntity(taskLinksResult.data, 'communication_meeting_id', 'task_id');
      const goalLinkMap = mapIdsByEntity(goalLinksResult.data, 'communication_meeting_id', 'monthly_goal_id');
      const monthlyGoalMap = Object.fromEntries((monthlyGoalsResult.data || []).map((goal) => [goal.id, goal]));
      const meetings = (meetingsResult.data || []).map((meeting) => ({
        ...meeting,
        responsible_ids: responsibleMap[meeting.id] || [],
        linked_tasks: (taskLinkMap[meeting.id] || []).map((taskId) => taskMap[taskId]).filter(Boolean),
        monthly_goal_ids: goalLinkMap[meeting.id] || [],
        linked_goals: (goalLinkMap[meeting.id] || []).map((goalId) => monthlyGoalMap[goalId]).filter(Boolean),
      }));
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const selected = meetings.find((meeting) => meeting.id === searchParams?.meeting)?.id
        || meetings.find((meeting) => meeting.month === currentMonth && meeting.year === currentYear)?.id
        || meetings[0]?.id
        || null;

      payload = {
        meetings,
        monthlyGoals: monthlyGoalsResult.data || [],
        tasks: context.tasks,
        internalUsers: context.internalUsers,
        boardOptions: context.boardOptions,
        selectedMeetingId: selected,
      };
    }
  } catch (error) {
    pageError = error.message || 'Error cargando reuniones mensuales de comunicacion. Ejecuta el SQL nuevo y vuelve a intentar.';
  }

  if (pageError) {
    return (
      <div className="p-8 text-center font-medium text-red-500">
        {pageError}
      </div>
    );
  }

  return (
    <CommunicationClient
      initialMeetings={payload.meetings}
      monthlyGoals={payload.monthlyGoals}
      availableTasks={payload.tasks}
      internalUsers={payload.internalUsers}
      boardOptions={payload.boardOptions}
      selectedMeetingId={payload.selectedMeetingId}
    />
  );
}
