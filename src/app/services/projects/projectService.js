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

    return this.projectRepo.find({
      where: {
        assigned_to: { user_id: userId }, // ✅ filtering based on assigned user
      },
      relations: ["assigned_to"],
      order: { project_id: "ASC" },
    });
  }


  // Create a new project and link to user by email
  async createProject({ title, description, deadline, status, email }) {
    await this.initializeRepositories();

    const user = await this.userRepo.findOneBy({ email });

    if (!user) {
      throw new Error("User not found");
    }

    const project = this.projectRepo.create({
      project_name: title,
      project_description: description,
      deadline,
      status,
      created_by: user,
    });

    const savedProject = await this.projectRepo.save(project);

    return {
      project_id: savedProject.project_id,
      project_name: savedProject.project_name,
      project_description: savedProject.project_description,
      deadline: savedProject.deadline,
      status: savedProject.status,
      created_by: savedProject.created_by.user_id,
    };
  }
}
