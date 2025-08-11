// app/services/project/projectService.js
import { initDb } from "@/app/lib/typeorm/init-db";
import { Project } from "@/app/lib/typeorm/entities/Project";
import { User } from "@/app/lib/typeorm/entities/User";

export class ProjectService {
  constructor() {
    this.projectRepo = null;
    this.userRepo = null;
  }

  async initializeRepositories() {
    if (!this.projectRepo || !this.userRepo) {
      const dataSource = await initDb();
      this.projectRepo = dataSource.getRepository(Project);
      this.userRepo = dataSource.getRepository(User);
    }
  }

  // Get all projects created by a specific user (userId)
  async getAllProjects(userId) {
    await this.initializeRepositories();

    return this.projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.assigned_to_rel", "user")
      .where("user.user_id = :userId", { userId })
      .select([
        "project.project_id",
        "project.project_name",
        "project.project_description",
        "project.status",
        "project.deadline",
        "project.assigned_to",
        "user.user_id",
        "user.username",
      ])
      .orderBy("project.project_id", "ASC")
      .getMany();
  }

  // Create a new project and link to user by email
  async createProject({ name, description, start_date, deadline, status, email }) {
    await this.initializeRepositories();

    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      throw new Error("User not found");
    }
    const project = this.projectRepo.create({
      project_name: name,
      project_description: description,
      start_date,
      deadline,
      status,
      assigned_to: user.user_id, 
    });

    const savedProject = await this.projectRepo.save(project);

    return {
      project_id: savedProject.project_id,
      project_name: savedProject.project_name,
      project_description: savedProject.project_description,
      start_date: savedProject.start_date,
      deadline: savedProject.deadline,
      status: savedProject.status,
      assigned_to: savedProject.assigned_to,
    };
  }
}
