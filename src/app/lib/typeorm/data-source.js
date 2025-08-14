// src/lib/typeorm/data-source.ts
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Role } from "./entities/Role";
import { UserRoles } from "./entities/User_Role";
import { Project } from "./entities/Project";
import { Task } from "./entities/Task";
import { AssignedUsersToProjects } from "./entities/AssignedUsersToProject";
import Screenshot from "./entities/Screenshot";


export const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "",
  database: "task_monitor",
  synchronize: false,
  logging: false,
  entities: [User, Role, UserRoles, Project, Task, AssignedUsersToProjects, Screenshot],
});

