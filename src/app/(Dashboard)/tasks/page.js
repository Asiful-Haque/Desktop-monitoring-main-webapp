import React from 'react';
// import Layout from '@/components/Layout';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken'; // Use 'jsonwebtoken' not 'jwt-decode' in server components
import Tasks from './TaskByProject';

const TasksPage = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userId = currentUser ? currentUser.id : null;

  console.log("Current User:", currentUser);
  console.log("User ID:", userId);

  let tasks = [];
  let projects = [];

if (userId) {
  try {
    const [tasksRes, projectsRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks/${userId}`, { cache: 'no-store' }),
      fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/${userId}`, { cache: 'no-store' }),
    ]);

    if (tasksRes.ok && projectsRes.ok) {
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      tasks = tasksData.tasks;
      projects = projectsData.projects;
    } else {
      console.error("Failed to fetch tasks or projects");
    }
  } catch (err) {
    console.error("Error fetching data:", err.message);
  }
}

  // console.log("Fetched Tasks:-----------------------", tasks);
  // console.log("Fetched Projects:-----------------------", projects);

  return (
    // <Layout>
      <Tasks tasks={tasks} projects={projects} curruser={currentUser} />
    // </Layout>
  );
};

export default TasksPage;
