import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsEmpty, corsJson } from "@/app/lib/coreResponse";
import { ScreenshotDataService } from "@/app/services/screenshotData/screenshotDataService";

const screenshotService = new ScreenshotDataService();
export async function POST(req) {
  try {
    const token = await getAuthFromCookie(req); 
    if (!token) {
      return corsJson({ error: "Token missing or invalid" }, 401);
    }

    // Proceed with the data handling
    const data = await req.json();

    if (
      !data.screenshotPath ||
      !data.task_id ||
      !data.timestamp ||
      typeof data.idleSeconds !== "number" ||
      typeof data.activeSeconds !== "number"
    ) {
      return corsJson({ error: "Invalid or missing fields" }, 400);
    }

    // Save the screenshot data (ensure your service also checks user authorization if needed)
    const result = await screenshotService.createScreenshotData(data);

    return corsJson(
      { message: "Screenshot data stored", insertedId: result.insertId },
      201
    );
  } catch (error) {
    console.error("❌ Error saving screenshot data:", error);
    return corsJson({ error: "Failed to save screenshot data" }, 500);
  }
}

// GET: Retrieve all screenshot data
export async function GET() {
  try {
    const screenshots = await screenshotService.getAllScreenshotData();
    return corsJson(screenshots, 200);
  } catch (error) {
    console.error("❌ Error retrieving screenshot data:", error);
    return corsJson({ error: "Failed to retrieve screenshot data" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}

