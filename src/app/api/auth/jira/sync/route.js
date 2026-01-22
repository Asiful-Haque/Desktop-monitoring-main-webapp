import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { JiraService } from "@/app/services/jiraRelatedServices/jiraService";

const jiraService = new JiraService();

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");

    if (!tokenCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Decode JWT to get tenant_id
    const decoded = jwt.decode(tokenCookie.value);
    const tenantId = decoded?.tenant_id;

    if (!tenantId) {
      return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    // 2. Refresh token if needed (This uses your refreshIfNeeded logic)
    // This returns the plain-text access token
    const accessToken = await jiraService.refreshIfNeeded(tenantId);
    
    // 3. Get the Cloud ID (This uses your getCredentials logic)
    const credentials = await jiraService.getCredentials(tenantId);

    if (!credentials?.cloudId) {
      return NextResponse.json({ error: "Jira Cloud ID not found in DB" }, { status: 404 });
    }

    // 4. Fetch from Jira API
    const jiraResponse = await fetch(
      `https://api.atlassian.com/ex/jira/${credentials.cloudId}/rest/api/3/search/jql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jql: "project IS NOT EMPTY ORDER BY updated DESC",
          maxResults: 50,
          fields: ["summary", "status", "project", "assignee", "updated"],
        }),
      }
    );

    const jiraData = await jiraResponse.json();

    if (!jiraResponse.ok) {
      throw new Error(jiraData.errorMessages?.[0] || "Jira API Failed");
    }

    // 5. Format issues for the frontend console
    const formattedData = jiraData.issues.map((issue) => ({
      jira_id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      project: issue.fields.project.name,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName || "Unassigned"
    }));

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData // This will appear in your browser console log
    });

  } catch (error) {
    console.error("Sync Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}