import { initDb } from "@/app/lib/typeorm/init-db";
import { User } from "@/app/lib/typeorm/entities/User";

export class UsersService {
  constructor() {
    this.userRepo = null;
  }

  async initializeRepository() {
    if (!this.userRepo) {
      const dataSource = await initDb();
      this.userRepo = dataSource.getRepository(User);
    }
    return this.userRepo;
  }

  // async getUsers() {
  //   const repo = await this.initializeRepository();
  //   return repo.find({
  //     take: 10,
  //     select: ["user_id", "username", "email", "created_at"],
  //     order: {
  //       user_id: "ASC",
  //     },
  //   });
  // }
  async getUsers() {
    const repo = await this.initializeRepository();

    return repo
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
      .orderBy("user_id", "ASC")
      .limit(10)
      .getRawMany(); // <- Important: getRawMany gives flat result
  }

  async getUserById(userId) {
    const repo = await this.initializeRepository();
    return repo.findOne({
      where: { user_id: userId },
      select: ["user_id", "username", "email", "created_at"],
    });
  }

  async createUser(data) {
    const repo = await this.initializeRepository();

    const user = repo.create({
      username: data.username,
      email: data.email,
      password: data.password, // Remember to hash passwords in production!
    });

    return repo.save(user);
  }
}
