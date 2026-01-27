import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Tenant } from "@/app/lib/typeorm/entities/Tenant";
import CryptoJS from "crypto-js";

import { User } from "@/app/lib/typeorm/entities/User";
import { Project } from "@/app/lib/typeorm/entities/Project";
import { Task } from "@/app/lib/typeorm/entities/Task";

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


async mapTenantUsers(tenantId, accessToken, cloudId) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    // 1. Fetch users linked to this tenant through the UserRoles relation
    // Adjust 'UserRoles' to match the name in your relations
    const users = await userRepo.createQueryBuilder("user")
        .innerJoin("user.user_roles_rel", "role") // Use the relation name from User entity
        .where("role.tenant_id = :tenantId", { tenantId: Number(tenantId) })
        .andWhere("user.jira_account_id IS NULL")
        .getMany();

    console.log(`🔗 Attempting to map ${users.length} unlinked users for Tenant ${tenantId}`);

    for (const user of users) {
        try {
            const response = await fetch(
                `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/user/search?query=${encodeURIComponent(user.email)}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            const results = await response.json();
            
            if (results && results.length > 0) {
                user.jira_account_id = results[0].accountId;
                await userRepo.save(user);
                console.log(`✅ Auto-Mapped: ${user.email} -> ${user.jira_account_id}`);
            }
        } catch (err) {
            console.error(`❌ Mapping failed for ${user.email}:`, err.message);
        }
    }
}

async syncJiraDataToDb(tenantId, jiraIssues) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const projectRepo = ds.getRepository(Project);
    const taskRepo = ds.getRepository(Task);

    console.log(`\n================ DIRECTORY SYNC DIAGNOSTIC ================`);
    console.log(`[INIT] Tenant: ${tenantId} | Issues: ${jiraIssues.length}`);

    let successCount = 0;
    let failCount = 0;
    
    // To keep track of unmapped projects we find during this run
    const unmappedProjects = [];
    const processedJiraProjectIds = new Set();

    for (const issue of jiraIssues) {
        console.log(`\n--- Processing: ${issue.key} ---`);
        
        try {
            const { assignee, project: jiraProject, summary, status, description, priority, duedate, created } = issue.fields;
            let localUserId = null;

            // --- PHASE 1: USER MAPPING ---
            try {
                if (assignee) {
                    const jiraAccountId = assignee.accountId;
                    let user = await userRepo.findOne({ where: { jira_account_id: jiraAccountId } });

                    if (!user && assignee.emailAddress) {
                        user = await userRepo.findOne({ where: { email: assignee.emailAddress } });
                    }

                    if (user) {
                        localUserId = user.user_id;
                        console.log(`  [PHASE 1] User found: ${user.email}`);
                    } else {
                        console.log(`  [PHASE 1] Creating new user for ${assignee.displayName}`);
                        const newUser = userRepo.create({
                            username: assignee.displayName,
                            email: assignee.emailAddress || `${jiraAccountId}@jira.placeholder`,
                            jira_account_id: jiraAccountId,
                            password: "", 
                            status: "PENDING_INVITE"
                        });
                        const savedUser = await userRepo.save(newUser);
                        localUserId = savedUser.user_id;

                        // Junction table mapping
                        await ds.createQueryBuilder()
                            .insert()
                            .into("user_roles") 
                            .values({ user_id: savedUser.user_id, tenant_id: Number(tenantId), role: "MEMBER" })
                            .orIgnore()
                            .execute();
                        console.log(`  [PHASE 1] New user created and linked to tenant`);
                    }
                }
            } catch (err) {
                console.error(`  [ERROR PHASE 1] User Mapping Failed:`, err.message);
                throw err; 
            }

            // --- PHASE 2: PROJECT CHECK (The "Pop-up" Logic) ---
            let localProj = await projectRepo.findOneBy({ 
                external_jira_id: jiraProject.id,
                tenant_id: Number(tenantId)
            });

            if (!localProj) {
                // If the project isn't linked, we stop and add it to the unmapped list
                if (!processedJiraProjectIds.has(jiraProject.id)) {
                    unmappedProjects.push({
                        id: jiraProject.id,
                        name: jiraProject.name,
                        key: jiraProject.key
                    });
                    processedJiraProjectIds.add(jiraProject.id);
                }
                console.log(`  [PHASE 2] Project "${jiraProject.name}" NOT LINKED. Skipping tasks.`);
                continue; // Skip tasks for this issue until project is mapped via Pop-up
            }

            console.log(`  [PHASE 2] Linked Project Found: ${localProj.project_name} (ID: ${localProj.project_id})`);

            // --- PHASE 3: DATA PARSING ---
            let plainDescription = "";
            if (description?.content) {
                plainDescription = description.content
                    .map(block => block.content ? block.content.map(c => c.text).join("") : "")
                    .join("\n");
            }
            
            const toMysqlDate = (dateStr) => dateStr ? new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ') : null;
            const mysqlDeadline = toMysqlDate(duedate);
            const mysqlStartDate = toMysqlDate(created) || toMysqlDate(new Date());

            // --- PHASE 4: TASK SYNC ---
            try {
                const taskPayload = {
                    external_jira_id: issue.id,
                    jira_key: issue.key,
                    task_name: summary,
                    task_description: plainDescription,
                    status: status?.name || "To Do",
                    priority: priority?.name?.toUpperCase() || "MEDIUM",
                    project_id: localProj.project_id, // Uses the ID found in Phase 2
                    assigned_to: localUserId, 
                    tenant_id: Number(tenantId),
                    deadline: mysqlDeadline,
                    start_date: mysqlStartDate,
                    last_timing: 0,
                    busy: 0,
                };

                await taskRepo.upsert(taskPayload, ["external_jira_id"]);
                console.log(`  [PHASE 4] Task Upserted Successfully`);
                successCount++;
            } catch (err) {
                console.error(`  [ERROR PHASE 4] Task Upsert Failed:`, err.message);
                throw err;
            }

        } catch (globalIssueErr) {
            failCount++;
            console.error(`[CRITICAL] Skipping issue ${issue.key} due to errors.`);
        }
    }

    console.log(`\n================ SYNC SUMMARY ================`);
    console.log(`✅ Success (Tasks): ${successCount}`);
    console.log(`❌ Failed (Tasks):  ${failCount}`);
    console.log(`⚠️ Unmapped Projects: ${unmappedProjects.length}`);
    console.log(`==============================================\n`);
    
    // Return both the count and the unmapped projects for the Frontend Pop-up
    return {
        syncedCount: successCount,
        unmappedProjects: unmappedProjects,
        requiresMapping: unmappedProjects.length > 0
    };
}
}