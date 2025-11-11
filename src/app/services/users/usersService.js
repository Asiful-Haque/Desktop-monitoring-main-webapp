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
    salary_type
  ) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const userRoleRepo = ds.getRepository(UserRoles);

    const hashedPassword = await bcrypt.hash(password, 10);

    const isFreelancer = roleName === "Freelancer";
    const timeSheetApproval = isFreelancer ? 0 : 1;

    // validate/normalize rate
    let rate = 0.0;
    if (
      default_hour_rate !== undefined &&
      default_hour_rate !== null &&
      default_hour_rate !== ""
    ) {
      const parsed = Number(default_hour_rate);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("default_hour_rate must be a non-negative number");
      }
      rate = Math.round(parsed * 100) / 100;
    }

    // validate salary_type for non-freelancers
    let normalizedSalaryType = null;
    if (!isFreelancer) {
      const allowed = ["Weekly", "Monthly"];
      if (!salary_type || !allowed.includes(salary_type)) {
        throw new Error(
          "salary_type is required for non-freelancers and must be 'Weekly' or 'Monthly'"
        );
      }
      normalizedSalaryType = salary_type;
    }

    const user = userRepo.create({
      username,
      email,
      password: hashedPassword,
      default_hour_rate: rate,
      time_sheet_approval: timeSheetApproval,
      salary_type: normalizedSalaryType, // persisted
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

  //Time sheet approval status: 0 = Approved, 1 = Sent/Pending
  async setTimeSheetApproval(userId, value /* 0 | 1 | 2 */) {
    console.log(
      "setTimeSheetApproval dddddediting.............................................................................. called with:",
      userId,
      value
    );
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    await userRepo.update({ user_id: userId }, { time_sheet_approval: value });

    const updated = await userRepo.findOne({
      where: { user_id: userId },
      select: ["user_id", "time_sheet_approval"],
    });
    return updated?.time_sheet_approval ?? null;
  }

  async getTimeSheetApproval(userId) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    const user = await userRepo.findOne({
      where: { user_id: userId },
      select: ["user_id", "time_sheet_approval"],
    });
    return user?.time_sheet_approval ?? null;
  }
}
