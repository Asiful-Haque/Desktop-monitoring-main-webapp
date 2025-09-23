
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { AssignedUsersToProjects } from "@/app/lib/typeorm/entities/AssignedUsersToProject";

export class TeamMemberService {
  async setMemberToProject(data) {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(AssignedUsersToProjects);

      const toNumberOrNull = (v) => {
        if (v === undefined || v === null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const newUser = repo.create({
        user_id: data.user_id,
        project_id: data.project_id,
        // NEW: persist optional per-project rate (nullable)
        user_rate_for_this_project: toNumberOrNull(
          data.user_rate_for_this_project
        ),
      });

      const savedUser = await repo.save(newUser);
      return savedUser;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  }

  async getMembersByProjectId(projectId) {
    // console.log("Fetching members for projectId:", projectId);
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
          // NEW: include the stored per-project rate in the result
          "aup.user_rate_for_this_project AS user_rate_for_this_project",
          "user.user_id AS user_id",
          "user.username AS username",
          "user.email AS email",
          "r.role_name AS role_name",
        ])
        .getRawMany();

      return rawMembers;
    } catch (error) {
      console.error("Error fetching members by projectId:", error);
      throw error;
    }
  }
}
