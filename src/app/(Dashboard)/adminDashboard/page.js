// app/admin/page.js (Server Component)
import AdminDashboardClient from "./AdminDashboardClient";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  // console.log("Token cookie in Admin Dashboard:", tokenCookie);
  if (!tokenCookie) throw new Error("Unauthorized");
  const raw = jwt.decode(tokenCookie.value);
  if (!raw) throw new Error("Unauthorized");
  const userId = raw.id;

  const curruser = {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
  };


  const cookieHeader = `token=${tokenCookie.value}`;

  const [usersRes, projectsRes, allProjectsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader, 
      },
    }),
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/${userId}`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader, 
      },
    }),
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader, 
      },
    }),
  ]);

  if (!usersRes.ok || !projectsRes.ok || !allProjectsRes.ok) {
    throw new Error("Failed to fetch data");
  }

  const { users } = await usersRes.json();
  const { projects } = await projectsRes.json();
  const { allprojects } = await allProjectsRes.json();

  return (
    <>
      <AdminDashboardClient
        users={users}
        projects={projects}
        allprojects={allprojects}
        curruser={curruser}
      />
    </>
  );
}
