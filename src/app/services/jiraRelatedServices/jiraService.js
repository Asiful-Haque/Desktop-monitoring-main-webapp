import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Tenant } from "@/app/lib/typeorm/entities/Tenant";
import CryptoJS from "crypto-js";

export class JiraService {
  #encrypt(text) {
    if (!text) return null;
    const key = process.env.JIRA_ENCRYPTION_KEY;
    if (!key) {
      console.error(
        "❌ CRITICAL ERROR: JIRA_ENCRYPTION_KEY is missing from .env file!",
      );
      throw new Error("Server configuration error: Encryption key missing.");
    }
    return CryptoJS.AES.encrypt(text, key).toString();
  }

  #decrypt(ciphertext) {
    if (!ciphertext) return null;
    const bytes = CryptoJS.AES.decrypt(
      ciphertext,
      process.env.JIRA_ENCRYPTION_KEY,
    );
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async updateJiraCredentials(
    tenantId,
    { cloudId, accessToken, refreshToken, expiresIn },
  ) {
    const ds = await getDataSource();
    const tenantRepo = ds.getRepository(Tenant);

    const tenant = await tenantRepo.findOneBy({ tenant_id: Number(tenantId) });
    if (!tenant) throw new Error("Tenant not found");

    const expiryDate = new Date(Date.now() + expiresIn * 1000);
    tenant.jira_cloud_id = cloudId;
    tenant.jira_access_token = this.#encrypt(accessToken);
    tenant.jira_refresh_token = this.#encrypt(refreshToken);
    tenant.jira_token_expires = expiryDate;

    return await tenantRepo.save(tenant);
  }

  async getCredentials(tenantId) {
    const ds = await getDataSource();
    const tenant = await ds
      .getRepository(Tenant)
      .findOneBy({ tenant_id: Number(tenantId) });

    if (!tenant) return null;

    return {
      cloudId: tenant.jira_cloud_id,
      accessToken: this.#decrypt(tenant.jira_access_token),
      refreshToken: this.#decrypt(tenant.jira_refresh_token),
    };
  }

  // src/app/services/jiraRelatedServices/jiraService.js

  async refreshIfNeeded(tenantId) {
    const ds = await getDataSource();
    const tenantRepo = ds.getRepository(Tenant);
    const tenant = await tenantRepo.findOneBy({ tenant_id: Number(tenantId) });

    if (!tenant || !tenant.jira_refresh_token)
      throw new Error("No refresh token found");

    // Check if token expires in the next 5 minutes (safety margin)
    const now = new Date();
    const margin = 5 * 60 * 1000;
    const isExpired =
      new Date(tenant.jira_token_expires).getTime() - margin < now.getTime();

    if (!isExpired) {
      return this.#decrypt(tenant.jira_access_token);
    }

    console.log("🔄 Token expired. Refreshing...");

    // Get the plain text refresh token
    const plainRefreshToken = this.#decrypt(tenant.jira_refresh_token);

    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: "gl4JMOZ9UV7vpO8LNBnM8XIviGSNEwhe",
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: plainRefreshToken,
      }),
    });

    const data = await response.json();

    if (!data.access_token) throw new Error("Refresh failed");

    // Encrypt and Save the NEW tokens
    const expiryDate = new Date(Date.now() + data.expires_in * 1000);
    tenant.jira_access_token = this.#encrypt(data.access_token);
    tenant.jira_refresh_token = this.#encrypt(data.refresh_token);
    tenant.jira_token_expires = expiryDate;

    await tenantRepo.save(tenant);

    return data.access_token; // Return the fresh plain text token
  }
}
