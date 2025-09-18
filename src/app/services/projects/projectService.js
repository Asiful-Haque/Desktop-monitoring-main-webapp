// // app/services/project/projectService.js
// import { initDb } from "@/app/lib/typeorm/init-db";
// import { Project } from "@/app/lib/typeorm/entities/Project";
// import { User } from "@/app/lib/typeorm/entities/User";

// export class ProjectService {
//   constructor() {
//     this.projectRepo = null;
//     this.userRepo = null;
//   }

//   async initializeRepositories() {
//     if (!this.projectRepo || !this.userRepo) {
//       const dataSource = await initDb();
//       this.projectRepo = dataSource.getRepository(Project);
//       this.userRepo = dataSource.getRepository(User);
//     }
//   }

//   // Get all projects created by a specific user (userId)
//   async getAllProjects(userId) {
//     await this.initializeRepositories();

//     return this.projectRepo
//       .createQueryBuilder("project")
//       .leftJoinAndSelect("project.assigned_to_rel", "user")
//       .where("user.user_id = :userId", { userId })
//       .select([
//         "project.project_id",
//         "project.project_name",
//         "project.project_description",
//         "project.status",
//         "project.deadline",
//         "project.assigned_to",
//         "user.user_id",
//         "user.username",
//       ])
//       .orderBy("project.project_id", "ASC")
//       .getMany();
//   }

//   // Get all projects only for seen Admin
//   async getAllProjectsForAdmin() {
//     await this.initializeRepositories();

//     return this.projectRepo
//       .createQueryBuilder("project")
//       .leftJoin("project.assigned_to_rel", "user")
//       .select([
//         "project.project_id",
//         "project.project_name",
//         "project.project_description",
//         "project.status",
//         "project.deadline",
//         "project.assigned_to",
//         "project.start_date",
//         "user.user_id",
//         "user.username",
//       ])
//       .orderBy("project.project_id", "ASC")
//       .getMany();
//   }

//   // Create a new project and link to user by email
//   async createProject({
//     name,
//     description,
//     start_date,
//     deadline,
//     status,
//     email,
//   }) {
//     await this.initializeRepositories();

//     const user = await this.userRepo.findOneBy({ email });
//     if (!user) {
//       throw new Error("User not found");
//     }
//     const project = this.projectRepo.create({
//       project_name: name,
//       project_description: description,
//       start_date,
//       deadline,
//       status,
//       assigned_to: user.user_id,
//     });

//     const savedProject = await this.projectRepo.save(project);

//     return {
//       project_id: savedProject.project_id,
//       project_name: savedProject.project_name,
//       project_description: savedProject.project_description,
//       start_date: savedProject.start_date,
//       deadline: savedProject.deadline,
//       status: savedProject.status,
//       assigned_to: savedProject.assigned_to,
//     };
//   }

//   async getProjectDetails(projectId) {
//     await this.initializeRepositories();

//     const project = await this.projectRepo
//       .createQueryBuilder("project")
//       .leftJoinAndSelect("project.assigned_to_rel", "user")
//       .where("project.project_id = :projectId", { projectId })
//       .select([
//         "project.project_id",
//         "project.project_name",
//         "project.project_description",
//         "project.status",
//         "project.start_date",
//         "project.deadline",
//         "project.assigned_to",
//         "user.user_id",
//         "user.username",
//       ])
//       .getOne();

//     return project || null;
//   }
// }

// app/services/project/projectService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Project } from "@/app/lib/typeorm/entities/Project";
import { User } from "@/app/lib/typeorm/entities/User";

export class ProjectService {
  // Get all projects created by a specific user (userId)
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
        "project.deadline",
        "project.assigned_to",
        "owner.user_id",
        "owner.username",
        "assignedUser.user_id",
        "assignedUser.username",
      ])
      .orderBy("project.project_id", "ASC")
      .getMany();
  }

  // Get all projects only for Admin
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
        "project.deadline",
        "project.assigned_to",
        "project.start_date",
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
  }) {
    const ds = await getDataSource();
    const projectRepo = ds.getRepository(Project);
    const userRepo = ds.getRepository(User);

    const user = await userRepo.findOneBy({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const project = projectRepo.create({
      project_name: name,
      project_description: description,
      start_date,
      deadline,
      status,
      assigned_to: user.user_id,
      tenant_id,
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
      // tenant_id: savedProject.tenant_id,
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
        "project.budget",
        "user.user_id",
        "user.username",
      ])
      .getOne();

    return project || null;
  }
}
