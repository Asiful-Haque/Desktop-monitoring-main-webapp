import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { User } from "@/app/lib/typeorm/entities/User";
import * as bcrypt from "bcrypt";

export class LoginService {
  async validateUser(email, password) {
    console.log("Entered in the function with", email, password);

    const ds = await getDataSource();
    const repo = ds.getRepository(User);

    // Fetch user with roles
    const user = await repo
      .createQueryBuilder("u")
      .leftJoin("u.user_roles_rel", "ur")
      .leftJoin("ur.role_rel", "r")
      .leftJoin("ur.tenant_rel", "t")
      .select([
        "u.user_id AS user_id",
        "u.username AS username",
        "u.email AS email",
        "u.password AS password",
        "r.role_id AS role_id",
        "ur.tenant_id AS tenant_id",
        "ur.currency AS currency",     
        "t.name AS tenant_name",          
        "r.role_name AS r_role_name",
      ])
      .where("u.email = :email", { email })
      .getRawOne();

    if (!user) {
      console.log("No user found with this email");
      return null;
    }

    console.log("User from DB:", user);

    const storedPassword = user.password; // use actual key from DB
    let isPasswordValid = false;

    if (!storedPassword) {
      console.log("Password field is empty for user:", email);
      return null;
    }

    // Detect bcrypt hash
    if (
      storedPassword.startsWith("$2a$") ||
      storedPassword.startsWith("$2b$") ||
      storedPassword.startsWith("$2y$")
    ) {
      isPasswordValid = await bcrypt.compare(password, storedPassword);
    } else {
      isPasswordValid = password === storedPassword;
    }

    if (!isPasswordValid) {
      console.log("Password mismatch for user:", email);
      return null;
    }

    console.log("------role is-----", user.r_role_name || null);

    return {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.r_role_name || null,
      tenant_id: user.tenant_id || null,
      tenant_name: user.tenant_name || null,
      currency: user.currency || null,
    };
  }
}
