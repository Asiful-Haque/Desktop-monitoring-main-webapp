
// import { User } from "@/app/entities/User";
// import { getDataSource } from "@/app/lib/init-db";


// export class SignupService {
//   constructor() {
//     this.userRepo = null;
//   }

//   async getUserRepo() {
//     if (!this.userRepo) {
//       const dataSource = await getDataSource();
//       this.userRepo = dataSource.getRepository("User");
//     }
//     return this.userRepo;
//   }

//   async findUserByEmail(email) {
//     const repo = await this.getUserRepo();
//     return repo.findOneBy({ email });
//   }

//   async createUser(userData) {
//     const repo = await this.getUserRepo();

//     const { username, email, password, role } = userData;
//     const safeData = { username, email, password };

//     console.log("Creating and saving user:", safeData);
//     const user = repo.create(safeData);
//     return repo.save(user);
//   }
// }
