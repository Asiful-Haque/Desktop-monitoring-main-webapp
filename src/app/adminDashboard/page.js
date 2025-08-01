// app/admin/page.tsx (Server Component)

import Header from "@/components/commonComponent/Header";
import AdminDashboardClient from "./AdminDashboardClient";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function AdminDashboard() {
  const cookieStore = await cookies();   
  const token = cookieStore.get('token')?.value;
  const currentUser = token ? jwt.decode(token) : null;
  console.log("Current User:", currentUser);
  const userId = currentUser ? currentUser.id : null;
  console.log("User ID:", userId);

  // Server-side fetch
  const [usersRes, projectsRes] = await Promise.all([
    fetch("http://localhost:5000/api/users", { cache: "no-store" }),
    fetch(`http://localhost:5000/api/projects/${userId}`, { cache: "no-store" }),
  ]);
  if (!usersRes.ok || !projectsRes.ok) {
    throw new Error("Failed to fetch data");
  }
  const { users } = await usersRes.json();
  const { projects } = await projectsRes.json();

  // Pass data to client component
  return (
    <>
      <Header user={currentUser} />
      <AdminDashboardClient users={users} projects={projects} />
    </>
  );
}
