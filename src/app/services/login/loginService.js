import { initDb } from "@/app/lib/typeorm/init-db";
import { User } from "@/app/lib/typeorm/entities/User";

export class LoginService {
  constructor() {
    this.userRepo = null;
  }

  async initializeRepository() {
    if (!this.userRepo) {
      const dataSource = await initDb(); // Use initDb here
      this.userRepo = dataSource.getRepository(User);
    }
    return this.userRepo;
  }

  async validateUser(email, password) {
    const repo = await this.initializeRepository();

    const user = await repo
      .createQueryBuilder("u")
      .leftJoin("u.user_roles_rel", "ur")
      .leftJoin("ur.role_rel", "r")
      .select(["u.user_id, u.username, u.email, u.password", "r.role_id", "r.role_name"])
      .where("u.email = :email", { email })
      .getRawOne();

    if (!user) {
      console.log("No user found with this email");
      return null;
    }

    // console.log("Password from DB:", user.password);
    // console.log("Password provided:", password);

    if (user.password !== password) {
      console.log("Password mismatch");
      return null;
    }

    console.log("------role is-----", user.r_role_name || null);

    return {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.r_role_name || null, 
    };
  }
}
