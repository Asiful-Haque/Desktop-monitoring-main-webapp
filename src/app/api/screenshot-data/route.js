import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { ScreenshotDataService } from '@/app/services/screenshotData/screenshotDataService';

const screenshotService = new ScreenshotDataService
export async function POST(request) {
  try {
    const data = await request.json();

    if (
      !data.screenshotPath ||
      !data.task ||
      !data.timestamp ||
      typeof data.idleSeconds !== 'number' ||
      typeof data.activeSeconds !== 'number'
    ) {
      return corsJson({ error: 'Invalid or missing fields' }, 400);
    }

    const result = await screenshotService.createScreenshotData(data);
    return corsJson({ message: 'Screenshot data stored', insertedId: result.insertedId }, 201);
  } catch (error) {
    console.error('❌ Error saving screenshot data:', error);
    return corsJson({ error: 'Failed to save screenshot data' }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
