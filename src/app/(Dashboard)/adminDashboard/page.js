// app/admin/page.tsx (Server Component)
import AdminDashboardClient from "./AdminDashboardClient";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function AdminDashboard() {
  const tokenCookie = cookies().get("token");
  if (!tokenCookie) throw new Error("Unauthorized");
  const raw = jwt.decode(tokenCookie.value);
  if (!raw) throw new Error("Unauthorized");
  const userId = raw.id;
  const curruser = {
    id: raw.id,
    email: raw.email,
    role: raw.role
  };
  // Server-side fetch
  const [usersRes, projectsRes, allProjectsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, { cache: "no-store" }),
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/${userId}`, { cache: "no-store" }),
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects`, { cache: "no-store" }),
  ]);
  if (!usersRes.ok || !projectsRes.ok || !allProjectsRes.ok) {
    throw new Error("Failed to fetch data");
  }
  const { users } = await usersRes.json();
  const { projects } = await projectsRes.json();
  const { allprojects } = await allProjectsRes.json();
  return (
    <>
      {/* <Header user={currentUser} /> */}
      <AdminDashboardClient users={users} projects={projects} allprojects={allprojects} curruser={curruser} />
    </>
  );
}
