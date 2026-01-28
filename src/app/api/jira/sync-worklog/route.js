import { NextResponse } from "next/server";
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Tenant } from "@/app/lib/typeorm/entities/Tenant";
import CryptoJS from "crypto-js";


function decryptToken(ciphertext) {
  console.log("Starting decryption for ciphertext...");
  if (!ciphertext) return null;

  try {
    const key = process.env.JIRA_ENCRYPTION_KEY;
    if (!key) {
      console.error("❌ CRITICAL ERROR: JIRA_ENCRYPTION_KEY is missing from .env file!");
      return null;
    }

    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if (!originalText) {
      console.error("Decryption failed: Result was empty string.");
      return null;
    }

    return originalText;
  } catch (err) {
    console.error("Decryption helper error:", err);
    return null;
  }
}

export async function POST(request) {
  console.log("🚀 In the Jira Sync post request");
  try {
    const { tenant_id, issueKey, seconds, comment } = await request.json();

    if (!tenant_id || !issueKey || !seconds) {
      console.error("❌ Missing required fields:", { tenant_id, issueKey, seconds });
      return NextResponse.json({ error: "Missing Jira data or Tenant ID" }, { status: 400 });
    }

    const ds = await getDataSource();
    const tenantRepo = ds.getRepository(Tenant);

    const tenant = await tenantRepo.findOneBy({ tenant_id: Number(tenant_id) });
    
    if (!tenant || !tenant.jira_cloud_id) {
      console.error("❌ Tenant not found or cloud_id missing for ID:", tenant_id);
      return NextResponse.json(
        { error: "Jira not integrated for this tenant" },
        { status: 404 }
      );
    }

    const accessToken = decryptToken(tenant.jira_access_token);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to decrypt access token. Check server logs." },
        { status: 500 }
      );
    }
    
    console.log("✅ Decryption successful. Proceeding to Jira API.");

    const jiraUrl = `https://api.atlassian.com/ex/jira/${tenant.jira_cloud_id}/rest/api/3/issue/${issueKey}/worklog`;

    const jiraResponse = await fetch(jiraUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeSpentSeconds: Math.floor(seconds),
        comment: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: comment || "Logged via TrackLively" }],
            },
          ],
        },
        // Formats to Atlassian-friendly ISO string: 2024-01-28T12:00:00.000+0000
        started: new Date().toISOString().replace('Z', '+0000')
      }),
    });

    const jiraData = await jiraResponse.json();

    if (!jiraResponse.ok) {
      console.error("❌ Jira API Error Response:", jiraData);
      return NextResponse.json(
        { error: "Atlassian API failed", details: jiraData },
        { status: jiraResponse.status }
      );
    }

    console.log("✅ Worklog created in Jira! ID:", jiraData.id);
    return NextResponse.json({ success: true, worklogId: jiraData.id });

  } catch (error) {
    console.error("❌ Sync Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}