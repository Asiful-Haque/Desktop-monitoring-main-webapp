// app/leave/page.js
import React from "react";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import LeaveDashboard from "@/components/Leave/LeavePage";



const getRoleName = (raw) =>
  String(raw?.role_name ?? raw?.role ?? raw?.roleType ?? raw?.role_type ?? "")
    .trim()
    .toLowerCase();

const isDevOrFreelancer = (raw) => {
  const roleName = getRoleName(raw);
  return roleName === "developer" || roleName === "freelancer";
};

export default async function LeavePage() {
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

  const cookieHeader = `token=${tokenCookie.value}`;

  // Same as your Attendance page approach
  const usersRes = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader }
  });

  if (!usersRes.ok) throw new Error("Failed to fetch users");
  const { users } = await usersRes.json();

  // ✅ rule:
  // - Developer / Freelancer => today only (no calendar)
  // - Otherwise => can select calendar date
  const canPickDate = !isDevOrFreelancer(raw);
  return <LeaveDashboard curruser={curruser} users={users} canPickDate={canPickDate} />;
}
