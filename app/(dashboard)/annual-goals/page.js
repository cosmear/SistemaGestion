import { createClient } from '@/utils/supabase/server';
import { requireAdminSession } from '@/utils/auth/admin';
import { getActiveInternalUsers } from '@/utils/internal-users';
import AnnualGoalsClient from './AnnualGoalsClient';

export default async function AnnualGoalsPage(props) {
  await requireAdminSession();
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  let pageError = null;
  let payload = {
    goals: [],
    internalUsers: [],
    selectedGoalId: null,
  };

  try {
    const [goalsResult, monthlyGoalsResult, internalUsers] = await Promise.all([
      supabase.from('annual_goals').select('*').order('year', { ascending: false }).order('updated_at', { ascending: false }),
      supabase.from('monthly_goals').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
      getActiveInternalUsers(supabase),
    ]);

    if (goalsResult.error || monthlyGoalsResult.error) {
      pageError = 'Error cargando objetivos anuales. Ejecuta el SQL nuevo y vuelve a intentar.';
    } else {
      const monthlyGoalsByAnnual = (monthlyGoalsResult.data || []).reduce((accumulator, goal) => {
        if (!goal.annual_goal_id) {
          return accumulator;
        }

        if (!accumulator[goal.annual_goal_id]) {
          accumulator[goal.annual_goal_id] = [];
        }

        accumulator[goal.annual_goal_id].push(goal);
        return accumulator;
      }, {});

      const goals = (goalsResult.data || []).map((goal) => ({
        ...goal,
        monthly_goals: monthlyGoalsByAnnual[goal.id] || [],
      }));
      const currentYear = new Date().getFullYear();
      const selectedGoalId = goals.find((goal) => goal.id === searchParams?.goal)?.id
        || goals.find((goal) => goal.status === 'active' && goal.year === currentYear)?.id
        || goals[0]?.id
        || null;

      payload = {
        goals,
        internalUsers,
        selectedGoalId,
      };
    }
  } catch (error) {
    pageError = error.message || 'Error cargando objetivos anuales. Ejecuta el SQL nuevo y vuelve a intentar.';
  }

  if (pageError) {
    return (
      <div className="p-8 text-center font-medium text-red-500">
        {pageError}
      </div>
    );
  }

  return (
    <AnnualGoalsClient
      initialGoals={payload.goals}
      internalUsers={payload.internalUsers}
      selectedGoalId={payload.selectedGoalId}
    />
  );
}
