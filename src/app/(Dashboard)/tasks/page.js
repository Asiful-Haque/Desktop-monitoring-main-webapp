import React from 'react';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import Tasks from './TaskByProject';

const TasksPage = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userId = currentUser ? currentUser.id : null;
  const role = currentUser ? currentUser.role : null; // assuming your token has `role`

  console.log("Current User:", currentUser);

  let tasks = [];
  let projects = [];

  if (userId) {
    try {
      // Always fetch user's own tasks and projects
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks/${userId}`, { cache: 'no-store' }),
        fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/${userId}`, { cache: 'no-store' }),
      ]);

      if (tasksRes.ok && projectsRes.ok) {
        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();
        tasks = tasksData.tasks;
        projects = projectsData.projects;
      }

      // If user is a Team Lead or some authority supreme, fetch team tasks as well 
      if (role === "Team Lead") {
        console.log("Fetching team lead tasks for userId:", userId);
        const teamTasksRes = await fetch(
          `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/taskForSupremeUsers/${userId}`, 
          { cache: 'no-store' }
        );

        if (teamTasksRes.ok) {
          const teamTasksData = await teamTasksRes.json();
          // Replace tasks with team tasks
          tasks = teamTasksData.tasks;
        } else {
          console.error("Failed to fetch team lead tasks");
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err.message);
    }
  }

  return (
    <Tasks tasks={tasks} projects={projects} curruser={currentUser} />
  );
};

export default TasksPage;
