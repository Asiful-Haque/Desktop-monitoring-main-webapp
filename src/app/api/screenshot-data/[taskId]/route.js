import { corsJson, corsEmpty } from "@/app/lib/coreResponse";
import { ScreenshotDataService } from "@/app/services/screenshotData/screenshotDataService";

const screenshotService = new ScreenshotDataService();

export async function GET(request, { params }) {
  try {
    const { taskId } = await params; 
    const rows = await screenshotService.getScreenshotsByTask(taskId);
    return corsJson(rows, 200);
  } catch (err) {
    console.error("❌ Error retrieving screenshot data:", err);
    return corsJson({ error: "Failed to retrieve screenshot data" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
