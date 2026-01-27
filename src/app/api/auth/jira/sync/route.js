import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { JiraService } from "@/app/services/jiraRelatedServices/jiraService";

const jiraService = new JiraService();

export async function POST(request) {
  console.log("=== JIRA SYNC POST REQUEST RECEIVED ===");
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    if (!tokenCookie?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.decode(tokenCookie.value);
    const tenantId = decoded?.tenant_id;
    if (!tenantId) return NextResponse.json({ error: "Invalid Token" }, { status: 401 });

    const accessToken = await jiraService.refreshIfNeeded(tenantId);
    const credentials = await jiraService.getCredentials(tenantId);

    await jiraService.mapTenantUsers(tenantId, accessToken, credentials.cloudId);

    const response = await fetch(
      `https://api.atlassian.com/ex/jira/${credentials.cloudId}/rest/api/3/search/jql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jql: "project IS NOT EMPTY ORDER BY updated DESC",
          maxResults: 100,
          fields: ["summary", "status", "project", "assignee", "description", "priority", "duedate", "created"],
        }),
      }
    );

    const jiraData = await response.json();
    if (!response.ok) throw new Error("Jira Fetch Failed");

    // This now returns { syncedCount, unmappedProjects, requiresMapping }
    const syncResult = await jiraService.syncJiraDataToDb(tenantId, jiraData.issues);

    return NextResponse.json({ 
      success: true, 
      ...syncResult // Spreads all fields into the response
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}