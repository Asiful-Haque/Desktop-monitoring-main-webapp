import React from "react";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Tasks from "./TaskByProject";

const TasksPage = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userId = currentUser ? currentUser.id : null;
  const role = currentUser ? currentUser.role : null;

  console.log("Current User:", currentUser);


  const cookieHeader = token ? `token=${token}` : "";

  let tasks = [];
  let projects = [];
  let allUsers = [];

  if (userId) {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks/${userId}`, {
          cache: "no-store",
          headers: { Cookie: cookieHeader }, 
        }),
        fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/${userId}`, {
          cache: "no-store",
          headers: { Cookie: cookieHeader }, 
        }),
      ]);

      if (tasksRes.ok && projectsRes.ok) {
        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();
        tasks = tasksData.tasks;
        projects = projectsData.projects;
      }

      if (role === "Team Lead" || role === "Project Manager") {
        console.log("Fetching team lead tasks for userId:", userId);
        const teamTasksRes = await fetch(
          `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/taskForSupremeUsers/${userId}`,
          { cache: "no-store", headers: { Cookie: cookieHeader } }
        );

        if (teamTasksRes.ok) {
          const teamTasksData = await teamTasksRes.json();
          tasks = teamTasksData.tasks;
        } else {
          console.error("Failed to fetch team lead tasks");
        }
      }

      if (role !== "Developer") {
        console.log("Fetching all users:");
        const usersRes = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
          cache: "no-store",
          headers: { Cookie: cookieHeader }, 
        });

        if (usersRes.ok) {
          allUsers = await usersRes.json();
          // console.log("All users fetched successfully:", allUsers);
        } else {
          console.error("Failed to fetch users");
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err.message);
    }
  }

  return (
    <Tasks
      tasks={tasks}
      projects={projects}
      curruser={currentUser}
      allusers={role !== "Developer" ? allUsers : undefined}
    />
  );
};

export default TasksPage;
