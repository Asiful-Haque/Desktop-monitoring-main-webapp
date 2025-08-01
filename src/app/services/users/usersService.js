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
      .leftJoin("user.user_roles_rel", "userRole_reference")   
      .leftJoin("userRole_reference.role_rel", "role_reference")        
      .select([
        "user.user_id",
        "user.username",
        "user.email",
        "user.created_at",
        "role_reference.role_name",
      ])
      .orderBy("user.user_id", "ASC")
      .limit(10)
      .getMany();
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
