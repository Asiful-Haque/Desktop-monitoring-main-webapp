// src/app/api/tracking/website/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsJson, corsEmpty } from "@/app/lib/coreResponse";
import { WebsiteService } from "@/app/services/tracking/websiteService";


const websiteService = new WebsiteService();

export async function POST(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) return corsJson({ error: "Unauthorized" }, 401);

    const body = await req.json(); // { 'linkedin.com': 200, 'github.com': 50 }
    console.log("Website Tracking POST body----------:", body);
    const user_id = token.id || token.user_id;

    await websiteService.upsertWebsiteTime({ user_id, entries: body });
    return corsJson({ message: "Data synced" }, 200);
  } catch (error) {
    return corsJson({ error: error.message }, 500);
  }
}

export async function GET(req) {
  try {
    console.log("Website Tracking GET request received");
    const token = await getAuthFromCookie(req);
    if (!token) return corsJson({ error: "Unauthorized" }, 401);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0];
    const user_id = searchParams.get("user_id") || token.id || token.user_id;

    console.log(`Fetching website tracking data for user_id: ${user_id} on date: ${date}`);

    const rows = await websiteService.getTrackingData({ user_id, date });
    console.log(`Retrieved ${rows.length} tracking records`);
    console.log("Rows:", rows);
    return corsJson({ rows }, 200);
  } catch (error) {
    return corsJson({ error: error.message }, 500);
  }
}

export async function OPTIONS() { return corsEmpty(); }