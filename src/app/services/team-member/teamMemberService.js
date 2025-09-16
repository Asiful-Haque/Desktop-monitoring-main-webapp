// app/services/teamMember/teamMemberService.ts (or .js)
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { AssignedUsersToProjects } from "@/app/lib/typeorm/entities/AssignedUsersToProject";

export class TeamMemberService {
  async setMemberToProject(data) {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(AssignedUsersToProjects);

      const newUser = repo.create({
        user_id: data.user_id,
        project_id: data.project_id,
      });
      const savedUser = await repo.save(newUser);
      return savedUser;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  }

  async getMembersByProjectId(projectId) {
    console.log("Fetching members for projectId:", projectId);
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(AssignedUsersToProjects);

      const rawMembers = await repo
        .createQueryBuilder("aup")
        .leftJoin("aup.user_rel", "user")
        .leftJoin("user.user_roles_rel", "ur")
        .leftJoin("ur.role_rel", "r")
        .where("aup.project_id = :projectId", { projectId })
        .select([
          "aup.project_id AS project_id",
          "aup.assigned_at AS assigned_at",
          "user.user_id AS user_id",
          "user.username AS username",
          "user.email AS email",
          "r.role_name AS role_name",
        ])
        .getRawMany();

      // console.log("Raw members:", rawMembers);
      return rawMembers;
    } catch (error) {
      console.error("Error fetching members by projectId:", error);
      throw error;
    }
  }
}
