// import { initDb } from "@/app/lib/typeorm/init-db";
// import { User } from "@/app/lib/typeorm/entities/User";
// import bcrypt from "bcrypt";

// export class UsersService {
//   constructor() {
//     this.userRepo = null;
//     this.roleRepo = null;
//     this.userRoleRepo = null;
//   }

//   async initializeRepositories() {
//     if (!this.userRepo || !this.roleRepo || !this.userRoleRepo) {
//       const dataSource = await initDb();
//       if (!this.userRepo) this.userRepo = dataSource.getRepository(User);
//       if (!this.roleRepo) this.roleRepo = dataSource.getRepository("Role");
//       if (!this.userRoleRepo) this.userRoleRepo = dataSource.getRepository("UserRoles");
//     }
//   }

//   async getUsers() {
//     await this.initializeRepositories();

//     return this.userRepo
//       .createQueryBuilder("user")
//       .leftJoin("user.user_roles_rel", "ur")
//       .leftJoin("ur.role_rel", "r")
//       .select([
//         "user.user_id AS user_id",
//         "user.username AS username",
//         "user.email AS email",
//         "user.created_at AS created_at",
//         "r.role_name AS role_name",
//       ])
//       .orderBy("user.user_id", "ASC")
//       .getRawMany();
//   }

//   async getUserById(userId) {
//     await this.initializeRepositories();
//     return this.userRepo.findOne({
//       where: { user_id: userId },
//       select: ["user_id", "username", "email", "created_at"],
//     });
//   }

//   async createUser(username, email, roleName, password) {
//     await this.initializeRepositories();

//     const hashedPassword = await bcrypt.hash(password, 10); //User created
//     const user = this.userRepo.create({
//       username,
//       email,
//       password: hashedPassword,
//     });
//     const savedUser = await this.userRepo.save(user);

//     const role = await this.roleRepo.findOne({ where: { role_name: roleName } }); // Find role by name by roleName
//     if (!role) {
//       throw new Error(`Role '${roleName}' not found`);
//     }

//     const userRole = this.userRoleRepo.create({ // saving both userid and roleid
//       user_id: savedUser.user_id,
//       role_id: role.role_id,
//     });
//     await this.userRoleRepo.save(userRole);
//     return savedUser;
//   }
// }




// app/services/users/usersService.ts (or .js)
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { User } from "@/app/lib/typeorm/entities/User";
import { Role } from "@/app/lib/typeorm/entities/Role";
import { UserRoles } from "@/app/lib/typeorm/entities/User_Role";
import bcrypt from "bcrypt";

export class UsersService {
  async getUsers() {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    return userRepo
      .createQueryBuilder("user")
      .leftJoin("user.user_roles_rel", "ur")
      .leftJoin("ur.role_rel", "r")
      .select([
        "user.user_id AS user_id",
        "user.username AS username",
        "user.email AS email",
        "user.created_at AS created_at",
        "r.role_name AS role_name",
      ])
      .orderBy("user.user_id", "ASC")
      .getRawMany();
  }

  async getUserById(userId) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);

    return userRepo.findOne({
      where: { user_id: userId },
      select: ["user_id", "username", "email", "created_at"],
    });
  }

  async createUser(username, email, roleName, password, tenant_id) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const userRoleRepo = ds.getRepository(UserRoles);

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = userRepo.create({
      username,
      email,
      password: hashedPassword,
    });
    const savedUser = await userRepo.save(user);

    // find role
    const role = await roleRepo.findOne({ where: { role_name: roleName } });
    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
    }

    // assign role to user
    const userRole = userRoleRepo.create({
      user_id: savedUser.user_id,
      role_id: role.role_id,
      tenant_id: tenant_id,
    });
    await userRoleRepo.save(userRole);

    return savedUser;
  }
}
