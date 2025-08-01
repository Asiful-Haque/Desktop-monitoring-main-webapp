// import { verifyToken } from '@/app/lib/auth';
// import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
// import { TaskService } from '@/app/services/Task/taskService';

// const taskService = new TaskService();

// export async function GET() {
//   try {
//     const tasks = await taskService.getAllTasks();
//     return corsJson(tasks);
//   } catch (error) {
//     return corsJson({ error: 'Failed to fetch tasks' }, 500);
//   }
// }

// export async function POST(request) {
//   try {
//     // Step 1: Get the Authorization header
//     const authHeader = request.headers.get('authorization');
    
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return corsJson({ error: 'Unauthorized: No token provided' }, 401);
//     }
//     const token = authHeader.split(' ')[1];
    
//     // Step 2: Verify token
//     const decoded = verifyToken(token);
//     if (!decoded) {
//       return corsJson({ error: 'Unauthorized: Invalid token' }, 401);
//     }

//     const data = await request.json();

//     if (!data.title || !data.assigned_to) {
//       return corsJson({ error: 'Title and assigned_to are required' }, 400);
//     }

//     const result = await taskService.createTask(data);
//     return corsJson({ message: 'Task created', taskId: result.insertId }, 201);
//   } catch (error) {
//     return corsJson({ error: 'Failed to create task' }, 500);
//   }
// }

// export async function OPTIONS() {
//   return corsEmpty();
// }
