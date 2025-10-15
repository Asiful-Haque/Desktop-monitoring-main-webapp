import { NextResponse } from "next/server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";

const service = new TimeTrackingService();

export async function PUT(req) {
  try {
    const { dates, flagger, userId, data } = await req.json();
    console.log("In ------------------ /api/update-flagger, received dates:", dates, "flagger:", flagger, "userId:", userId, "data:", data);
  ///ekahne update flageer date er bodol e data er moddhe asha id gulo niye oi id gulo er flagger update korte hobe
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "No valid dates provided" }, { status: 400 });
    }

    const updatedItems = await service.updateFlaggerForSerialIds(data, flagger, userId);

    return NextResponse.json({
      ok: true,
      message: `${updatedItems.length} date(s) processed successfully.`,
      processed: updatedItems,
    });
  } catch (err) {
    console.error("Error in /api/update-flagger:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
