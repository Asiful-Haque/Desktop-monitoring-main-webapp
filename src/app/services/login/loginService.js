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
    console.log("Validating user with email:", email);
    const repo = await this.initializeRepository();

    const user = await repo.findOne({
      where: { email },
    });

    if (!user) return null;

    if (user.password !== password) {
      return null;
    }
    return user;
  }
}
