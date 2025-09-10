import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";
import CryptoJS from 'crypto-js';

const service = new TimeTrackingService();

export async function GET(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

     const url1 = new URL(req.url);
     const devId = url1.pathname.split('/')[3];

    if (!devId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }
    const url = new URL(req.url);
    const date  = url.searchParams.get("date"); 
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
    const items = await service.findByUserAndDay(devId, date);
    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("GET /time-tracking failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch time tracking" },
      { status: 400 }
    );
  }
}