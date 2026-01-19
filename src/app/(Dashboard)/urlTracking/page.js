import React from "react";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import WebsiteTrackingClient from "@/components/Tracking/WebsiteTrackingClient";

export default async function TrackingPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  if (!tokenCookie?.value) throw new Error("Unauthorized");

  const raw = jwt.decode(tokenCookie.value);
  const curruser = { id: raw.id, name: raw.name };

  const today = new Date().toISOString().split('T')[0];
  const cookieHeader = `token=${tokenCookie.value}`;

  // Fetching the rows from your API
  const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tracking/website?date=${today}`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader }
  });

  const data = res.ok ? await res.json() : { rows: [] };

  return (
    <div>
      <WebsiteTrackingClient 
        curruser={curruser} 
        initialRows={data.rows || []} 
      />
    </div>
  );
}