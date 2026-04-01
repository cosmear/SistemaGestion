import { createClient } from '@/utils/supabase/server';
import { requireAdminSession } from '@/utils/auth/admin';
import { getExecutionContext } from '@/utils/execution-data';
import MonthlyGoalsClient from './MonthlyGoalsClient';

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

export default async function MonthlyGoalsPage(props) {
  const session = await requireAdminSession();
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  let pageError = null;
  let payload = {
    goals: [],
    annualGoals: [],
    internalUsers: [],
    availableTasks: [],
    boardOptions: [],
    selectedGoalId: null,
  };

  try {
    const [
      context,
      goalsResult,
      annualGoalsResult,
      taskLinksResult,
      dailyGoalLinksResult,
      communicationGoalLinksResult,
      dailyMeetingsResult,
      communicationMeetingsResult,
    ] = await Promise.all([
      getExecutionContext(supabase, session),
      supabase.from('monthly_goals').select('*').order('year', { ascending: false }).order('month', { ascending: false }).order('updated_at', { ascending: false }),
      supabase.from('annual_goals').select('*').order('year', { ascending: false }).order('updated_at', { ascending: false }),
      supabase.from('monthly_goal_tasks').select('monthly_goal_id, task_id'),
      supabase.from('daily_meeting_monthly_goals').select('daily_meeting_id, monthly_goal_id'),
      supabase.from('communication_meeting_monthly_goals').select('communication_meeting_id, monthly_goal_id'),
      supabase.from('daily_meetings').select('id, meeting_date, focus_of_day, status').order('meeting_date', { ascending: false }),
      supabase.from('communication_meetings').select('id, month, year, title, status').order('year', { ascending: false }).order('month', { ascending: false }),
    ]);

    if (
      goalsResult.error
      || annualGoalsResult.error
      || taskLinksResult.error
      || dailyGoalLinksResult.error
      || communicationGoalLinksResult.error
      || dailyMeetingsResult.error
      || communicationMeetingsResult.error
    ) {
      pageError = 'Error cargando objetivos mensuales. Ejecuta el SQL nuevo y vuelve a intentar.';
    } else {
      const annualGoalMap = Object.fromEntries((annualGoalsResult.data || []).map((goal) => [goal.id, goal]));
      const taskMap = Object.fromEntries(context.tasks.map((task) => [task.id, task]));
      const dailyMeetingMap = Object.fromEntries((dailyMeetingsResult.data || []).map((meeting) => [meeting.id, meeting]));
      const communicationMeetingMap = Object.fromEntries((communicationMeetingsResult.data || []).map((meeting) => [meeting.id, meeting]));
      const taskLinkMap = mapIdsByEntity(taskLinksResult.data, 'monthly_goal_id', 'task_id');
      const dailyLinkMap = (dailyGoalLinksResult.data || []).reduce((accumulator, row) => {
        if (!row?.monthly_goal_id || !row?.daily_meeting_id) {
          return accumulator;
        }

        if (!accumulator[row.monthly_goal_id]) {
          accumulator[row.monthly_goal_id] = [];
        }

        accumulator[row.monthly_goal_id].push(row.daily_meeting_id);
        return accumulator;
      }, {});
      const communicationLinkMap = (communicationGoalLinksResult.data || []).reduce((accumulator, row) => {
        if (!row?.monthly_goal_id || !row?.communication_meeting_id) {
          return accumulator;
        }

        if (!accumulator[row.monthly_goal_id]) {
          accumulator[row.monthly_goal_id] = [];
        }

        accumulator[row.monthly_goal_id].push(row.communication_meeting_id);
        return accumulator;
      }, {});
      const goals = (goalsResult.data || []).map((goal) => ({
        ...goal,
        annual_goal: goal.annual_goal_id ? annualGoalMap[goal.annual_goal_id] || null : null,
        linked_tasks: (taskLinkMap[goal.id] || []).map((taskId) => taskMap[taskId]).filter(Boolean),
        linked_daily_meetings: (dailyLinkMap[goal.id] || []).map((meetingId) => dailyMeetingMap[meetingId]).filter(Boolean),
        linked_communication_meetings: (communicationLinkMap[goal.id] || [])
          .map((meetingId) => communicationMeetingMap[meetingId])
          .filter(Boolean),
      }));
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const selectedGoalId = goals.find((goal) => goal.id === searchParams?.goal)?.id
        || goals.find((goal) => goal.month === currentMonth && goal.year === currentYear)?.id
        || goals[0]?.id
        || null;

      payload = {
        goals,
        annualGoals: annualGoalsResult.data || [],
        internalUsers: context.internalUsers,
        availableTasks: context.tasks,
        boardOptions: context.boardOptions,
        selectedGoalId,
      };
    }
  } catch (error) {
    pageError = error.message || 'Error cargando objetivos mensuales. Ejecuta el SQL nuevo y vuelve a intentar.';
  }

  if (pageError) {
    return (
      <div className="p-8 text-center font-medium text-red-500">
        {pageError}
      </div>
    );
  }

  return (
    <MonthlyGoalsClient
      initialGoals={payload.goals}
      annualGoals={payload.annualGoals}
      internalUsers={payload.internalUsers}
      availableTasks={payload.availableTasks}
      boardOptions={payload.boardOptions}
      selectedGoalId={payload.selectedGoalId}
    />
  );
}
