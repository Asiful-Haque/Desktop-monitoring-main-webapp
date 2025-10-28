// app/services/users/usersService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { User } from "@/app/lib/typeorm/entities/User";
import { Role } from "@/app/lib/typeorm/entities/Role";
import { UserRoles } from "@/app/lib/typeorm/entities/User_Role";
import bcrypt from "bcrypt";

export class UsersService {
  async getUsers(tenant_id) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    return userRepo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles_rel", "ur")
      .innerJoin("ur.role_rel", "r")
      .select([
        "user.user_id AS user_id",
        "user.username AS username",
        "user.email AS email",
        "user.default_hour_rate AS default_hour_rate",
        "user.created_at AS created_at",
        "r.role_name AS role_name",
      ])
      .where("ur.tenant_id = :tenant_id", { tenant_id })
      .orderBy("user.user_id", "ASC")
      .getRawMany();
  }

  async getUserById(userId) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    return userRepo.findOne({
      where: { user_id: userId },
      select: [
        "user_id",
        "username",
        "email",
        "default_hour_rate",
        "created_at",
      ],
    });
  }

  async createUser(
    username,
    email,
    roleName,
    password,
    tenant_id,
    default_hour_rate,
    time_sheet_approval
  ) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const userRoleRepo = ds.getRepository(UserRoles);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepo.create({
      username,
      email,
      password: hashedPassword,
      default_hour_rate:
        default_hour_rate !== undefined && default_hour_rate !== null
          ? Number(parseFloat(default_hour_rate).toFixed(2))
          : 0.0,
      time_sheet_approval: time_sheet_approval,
    });

    const savedUser = await userRepo.save(user);

    const role = await roleRepo.findOne({ where: { role_name: roleName } });
    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
    }

    const userRole = userRoleRepo.create({
      user_id: savedUser.user_id,
      role_id: role.role_id,
      tenant_id,
    });
    await userRoleRepo.save(userRole);

    return savedUser;
  }

  async getTimesheetApproval(user_id) {
    console.log("Fetching timesheet approval for user_id55555555555555555:", user_id);
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    const rec = await userRepo
      .createQueryBuilder("user")
      .where("user.user_id = :user_id", { user_id })
      .select([
        "user.user_id AS user_id",
        "user.username AS username",
        "user.time_sheet_approval AS time_sheet_approval",
        "user.updated_at AS updated_at",
      ])
      .getRawOne();

    if (!rec) {
      const err = new Error("User not found");
      err.code = "NOT_FOUND";
      throw err;
    }
    return rec;
  }

  async setTimesheetApproval(user_id, time_sheet_approval) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    const exists = await userRepo.findOne({
      where: { user_id: Number(user_id) },
    });
    if (!exists) {
      const err = new Error("User not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    await userRepo.update(
      { user_id: Number(user_id) },
      { time_sheet_approval: Number(time_sheet_approval) }
    );

    return this.getTimesheetApproval(user_id);
  }
}
