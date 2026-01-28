import { NextResponse } from "next/server";
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Project } from "@/app/lib/typeorm/entities/Project";
import { getAuthFromCookie } from "@/app/lib/auth-server";

export async function POST(request) {
  try {
    const token = await getAuthFromCookie(request);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = Number(token.tenant_id || token.tenantId);
    const { mappings } = await request.json(); // Array of mappings
    
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(Project);

    // Using a Transaction for "All or Nothing" at the DB level
    await ds.transaction(async (transactionalEntityManager) => {
      for (const map of mappings) {
        if (map.mode === "CREATE_NEW") {
          const newProj = projectRepo.create({
            project_name: map.jiraName,
            jira_project_key: map.jiraKey,
            external_jira_id: map.jiraId,
            tenant_id: tenantId,
            status: "in_progress",
            created_at: new Date(),
            updated_at: new Date(),
          });
          await transactionalEntityManager.save(Project, newProj);
        } else {
          await transactionalEntityManager.update(
            Project,
            { project_id: map.localProjectId, tenant_id: tenantId },
            {
              external_jira_id: map.jiraId,
              jira_project_key: map.jiraKey,
              updated_at: new Date(),
            }
          );
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk mapping error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}