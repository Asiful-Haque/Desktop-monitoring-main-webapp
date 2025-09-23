// app/services/project/projectService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Project } from "@/app/lib/typeorm/entities/Project";
import { User } from "@/app/lib/typeorm/entities/User";

export class ProjectService {
  // Get all projects created by / assigned to a specific user (userId)
  async getAllProjects(userId) {
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(Project);

    return projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.assigned_to_rel", "owner")
      .leftJoin("project.assigned_users_rel", "aup")
      .leftJoin("aup.user_rel", "assignedUser")
      .where("owner.user_id = :userId", { userId })
      .orWhere("assignedUser.user_id = :userId", { userId })
      .select([
        "project.project_id",
        "project.project_name",
        "project.project_description",
        "project.status",
        "project.start_date",
        "project.deadline",
        "project.assigned_to",
        "project.client_name",
        "project.project_type",
        "project.total_budget",
        "project.project_hour_rate",
        "owner.user_id",
        "owner.username",
        "assignedUser.user_id",
        "assignedUser.username",
      ])
      .orderBy("project.project_id", "ASC")
      .getMany();
  }

  // Get all projects for Admin (scoped by tenant)
  async getAllProjectsForAdmin(tenant_id) {
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(Project);

    return projectRepo
      .createQueryBuilder("project")
      .leftJoin("project.assigned_to_rel", "user")
      .select([
        "project.project_id",
        "project.project_name",
        "project.project_description",
        "project.status",
        "project.start_date",
        "project.deadline",
        "project.assigned_to",
        "project.client_name",
        "project.project_type",
        "project.total_budget",
        "project.project_hour_rate",
        "user.user_id",
        "user.username",
      ])
      .where("project.tenant_id = :tenant_id", { tenant_id })
      .orderBy("project.project_id", "ASC")
      .getMany();
  }

  // Create a new project and link to user by email
  async createProject({
    name,
    description,
    start_date,
    deadline,
    status,
    email,
    tenant_id,
    // NEW FIELDS
    client_name = null,
    project_type, // "fixed" | "hourly"
    total_budget = null,
    project_hour_rate = null,
  }) {
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(Project);
    const userRepo = ds.getRepository(User);

    const user = await userRepo.findOneBy({ email });
    if (!user) throw new Error("User not found");

    // Coerce numbers / enforce mutual exclusivity as a safety net
    const toNumOrNull = (v) =>
      v === "" || v === null || v === undefined ? null : Number(v);
    let coercedTotal = toNumOrNull(total_budget);
    let coercedRate = toNumOrNull(project_hour_rate);

    if (project_type === "fixed") {
      coercedRate = null;
    } else if (project_type === "hourly") {
      coercedTotal = null;
    }

    const project = projectRepo.create({
      project_name: name,
      project_description: description,
      start_date,
      deadline,
      status,
      assigned_to: user.user_id,
      tenant_id,
      // NEW FIELDS
      client_name,
      project_type,
      total_budget: coercedTotal,
      project_hour_rate: coercedRate,
    });

    const savedProject = await projectRepo.save(project);

    return {
      project_id: savedProject.project_id,
      project_name: savedProject.project_name,
      project_description: savedProject.project_description,
      start_date: savedProject.start_date,
      deadline: savedProject.deadline,
      status: savedProject.status,
      assigned_to: savedProject.assigned_to,
      client_name: savedProject.client_name,
      project_type: savedProject.project_type,
      total_budget: savedProject.total_budget,
      project_hour_rate: savedProject.project_hour_rate,
    };
  }

  async getProjectDetails(projectId) {
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(Project);

    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.assigned_to_rel", "user")
      .where("project.project_id = :projectId", { projectId })
      .select([
        "project.project_id",
        "project.project_name",
        "project.project_description",
        "project.status",
        "project.start_date",
        "project.deadline",
        "project.assigned_to",
        // Keep old 'budget' if you still have it, but include new fields:
        "project.budget",
        "project.client_name",
        "project.project_type",
        "project.total_budget",
        "project.project_hour_rate",
        "user.user_id",
        "user.username",
      ])
      .getOne();

    return project || null;
  }

  async updateProject(projectId, data) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Project);

    const project = await repo.findOne({ where: { project_id: projectId } });
    if (!project) return null;

    // Optional: enforce exclusivity on update too
    if (data?.project_type === "fixed") {
      data.project_hour_rate = null;
    } else if (data?.project_type === "hourly") {
      data.total_budget = null;
    }

    Object.assign(project, data, { updated_at: new Date() });
    return repo.save(project);
  }
}
