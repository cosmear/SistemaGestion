import { createClient } from '@/utils/supabase/server';
import KanbanClient from './KanbanClient';
import { cookies } from 'next/headers';

export default async function TasksPage(props) {
  // En Next.js 15, los searchParams pueden ser promesas
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const userName = cookieStore.get('session_user')?.value || 'Guest';

  // Si no se especifica board por URL, el predeterminado es el personal del usuario actual
  const targetBoard = searchParams?.board ? String(searchParams.board) : `personal_${userName}`;

  const supabase = await createClient();

  // Listamos los clientes activos para popular el dropdown de tableros de clientes
  const { data: clients } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');

  // Traer columnas SÓLO del tablero seleccionado
  let { data: columns, error: colError } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('board_id', targetBoard)
    .order('position', { ascending: true });

  if (colError) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Kanban (Columnas). Asegúrate de tener conexión.
      </div>
    );
  }

  // Generación lazy de columnas: Si este tablero específico no tiene columnas, créalas
  if (!columns || columns.length === 0) {
    const defaultCols = [
      { board_id: targetBoard, title: 'To Do', position: 0 },
      { board_id: targetBoard, title: 'En Progreso', position: 1 },
      { board_id: targetBoard, title: 'Terminadas', position: 2 }
    ];
    await supabase.from('kanban_columns').insert(defaultCols);
    
    // Obtener nuevamente tras la creación
    const res = await supabase
       .from('kanban_columns')
       .select('*')
       .eq('board_id', targetBoard)
       .order('position', { ascending: true });
    columns = res.data || [];
  }

  // Obtener exclusivamente las tareas de este tablero en particular
  const colIds = columns.map(c => c.id);
  let tasks = [];
  
  if (colIds.length > 0) {
    const { data: reqTasks } = await supabase
      .from('kanban_tasks')
      .select('*')
      .in('column_id', colIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    tasks = reqTasks || [];
  }

  return (
    <KanbanClient 
      initialColumns={columns} 
      initialTasks={tasks} 
      activeBoard={targetBoard} 
      userName={userName} 
      allClients={clients || []} 
    />
  );
}
