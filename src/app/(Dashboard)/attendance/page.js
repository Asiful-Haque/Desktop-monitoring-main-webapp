import React from "react";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import ManualAttendancePage from "@/components/ManualAttendance/ManualAttendance";
import MyAttendanceToday from "@/components/ManualAttendance/SelfAttendenceToday";


const isAdminUser = (raw) => {
  const roleName = String(raw?.role_name ?? raw?.role ?? raw?.roleType ?? raw?.role_type ?? "")
    .trim()
    .toLowerCase();

  const isAdminFlag =
    raw?.is_admin === true ||
    raw?.isAdmin === true ||
    raw?.is_admin === 1 ||
    raw?.isAdmin === 1 ||
    raw?.is_admin === "1";

  const roleBased =
    roleName === "admin" ||
    roleName === "administrator" ||
    roleName === "superadmin" ||
    roleName === "super_admin" ||
    roleName === "owner";

  return Boolean(isAdminFlag || roleBased);
};

export default async function AttendancePage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  if (!tokenCookie?.value) throw new Error("Unauthorized");

  const raw = jwt.decode(tokenCookie.value);
  if (!raw) throw new Error("Unauthorized");

  const curruser = {
    id: raw.id,
    tenant_id: raw.tenant_id,
    tenant_name: raw.tenant_name,
    name: raw.name,
    email: raw.email,
    role: raw.role || raw.role_name || raw.role_type,
    currency: raw.currency
  };

  const admin = isAdminUser(raw);

  if (!admin) {
    return <MyAttendanceToday curruser={curruser} />;
  }

  const cookieHeader = `token=${tokenCookie.value}`;

  const usersRes = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader }
  });

  if (!usersRes.ok) throw new Error("Failed to fetch users");
  const { users } = await usersRes.json();

  return <ManualAttendancePage curruser={curruser} users={users} />;
}
