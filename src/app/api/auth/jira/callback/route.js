import { JiraService } from "@/app/services/jiraRelatedServices/jiraService";
import { NextResponse } from "next/server";

const jiraService = new JiraService();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const tenantId = searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }
    const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: "gl4JMOZ9UV7vpO8LNBnM8XIviGSNEwhe",
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code: code,
        redirect_uri: "http://localhost:5500/api/auth/jira/callback",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token");
    }

    // Get the Cloud ID
    const res = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );

    const resources = await res.json();
    const cloudId = resources[0]?.id;

    console.log("Data to be saved:", {
      tenantId,
      cloudId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    await jiraService.updateJiraCredentials(tenantId, {
      cloudId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    console.log(`Success: Jira credentials saved for Tenant ${tenantId}`);
    return NextResponse.redirect(
      new URL("/integration-success-page", request.url),
    );
  } catch (error) {
    console.error("Jira Callback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
