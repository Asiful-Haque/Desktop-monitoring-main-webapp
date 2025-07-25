// app/admin/page.tsx (Server Component)

import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
  // Server-side fetch
  const res1 = await fetch("http://localhost:5000/api/users", {
    method: "GET",
    cache: "no-store",
  });
  if (!res1.ok) {
    throw new Error("Failed to fetch users");
  }
  const { users, total } = await res1.json();

  const res2 = await fetch("http://localhost:5000/api/projects", {
    method: "GET",
    cache: "no-store",
  });
  if (!res2.ok) {
    throw new Error("Failed to fetch projects");
  }
  const { projects } = await res2.json();

  // Pass data to client component
  return <AdminDashboardClient users={users} projects={projects} />;
}
