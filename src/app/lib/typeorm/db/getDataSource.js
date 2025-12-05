import { DataSource } from "typeorm";
import { User } from "../entities/User.js";
import { Role } from "../entities/Role.js";
import { UserRoles } from "../entities/User_Role.js";
import { Project } from "../entities/Project.js";
import { Task } from "../entities/Task.js";
import { AssignedUsersToProjects } from "../entities/AssignedUsersToProject.js";
import Screenshot from "../entities/Screenshot.js";
import { Tenant } from "../entities/Tenant.js";
import { TimeTracking } from "../entities/TimeTracking.js";
import { Transaction } from "../entities/Transaction.js";
import { PaymentLog } from "../entities/PaymentLog.js";

export const AppDataSource = new DataSource({
  type: "mysql",
  connectorPackage: "mysql2",
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  username: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE || "task_monitor_demo",
  synchronize: false,
  logging: false,
  entities: [
    User,
    Role,
    UserRoles,
    Project,
    Task,
    AssignedUsersToProjects,
    Screenshot,
    Tenant,
    TimeTracking,
    Transaction,
    PaymentLog,
  ],

  // ✅ IMPORTANT: treat DB DATE/DATETIME as UTC
  timezone: "Z",

  extra: {
    connectionLimit: 10,
    decimalNumbers: true,

    // ✅ also pass through to mysql2
    timezone: "Z",
  },
});

let _ds;
export async function getDataSource() {
  if (!_ds) _ds = AppDataSource;
  if (!_ds.isInitialized) {
    await _ds.initialize();
    console.log("✅ Entities loaded:", _ds.entityMetadatas.map((m) => m.name));
    console.log("✅ Database connection established (singleton)");
  }
  return _ds;
}
