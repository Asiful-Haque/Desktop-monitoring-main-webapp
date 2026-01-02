import ManualAttendancePage from '@/components/ManualAttendance/ManualAttendance';
import React from 'react'
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function ManualAttendance() {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    // console.log("Token cookie in Admin attendance:", tokenCookie);
    if (!tokenCookie) throw new Error("Unauthorized");
    const raw = jwt.decode(tokenCookie.value);
    if (!raw) throw new Error("Unauthorized");
  
    const curruser = {
      id: raw.id,
      tenant_id: raw.tenant_id,
      tenant_name: raw.tenant_name,
      name: raw.name,
      email: raw.email,
      role: raw.role,
      currency: raw.currency,
    };

  const cookieHeader = `token=${tokenCookie.value}`;

  const [usersRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader, 
      },
    }),
  ]);

  if (!usersRes.ok) {
    throw new Error("Failed to fetch data");
  }
  const { users } = await usersRes.json();


  return (
    <div>
    <ManualAttendancePage curruser={curruser} users={users} />
    </div>
  )
}