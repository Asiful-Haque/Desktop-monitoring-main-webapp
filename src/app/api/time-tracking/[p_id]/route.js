import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";
import CryptoJS from 'crypto-js';

const service = new TimeTrackingService();

export async function POST(req) {
  try {
    // Authentication check
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { p_id } = req.params;
    if (!p_id) {
      return NextResponse.json({ error: "project ID is required" }, { status: 400 });
    }
    const projectId = p_id;
    const date = url.searchParams.get("date");  

    if (!date) {
      return NextResponse.json(
        { error: "Please provide a date in the query string" },
        { status: 400 }
      );
    }

    // Validate the decrypted date format (YYYY-MM-DD)
    const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isYmd(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Fetch time tracking data for the given projectId and date (from 00:00 to 23:59)
    const items = await service.findByProjectAndDay(projectId, date);

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("POST /time-tracking failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process request" },
      { status: 400 }
    );
  }
}



// GET route to fetch time-tracking data for a specific project and date
export async function GET(req) {
  try {
    // Authentication check
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

     const url1 = new URL(req.url);
     const projectId = url1.pathname.split('/')[3];

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Get the query parameters
    const url = new URL(req.url);
    const date  = url.searchParams.get("date"); // Extract date from query parameters

    if (!date ) {
      return NextResponse.json(
        { error: "Please provide a date in YYYY-MM-DD format" },
        { status: 400 }
      );
    }
    // Validate the date format (YYYY-MM-DD)
    const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isYmd(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Fetch time tracking data for the given projectId and date (from 00:00 to 23:59)
    const items = await service.findByProjectAndDay(projectId, date);

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("GET /time-tracking failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch time tracking" },
      { status: 400 }
    );
  }
}