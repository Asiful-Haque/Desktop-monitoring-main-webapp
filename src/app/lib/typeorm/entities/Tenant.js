// src/lib/typeorm/entities/Tenant.ts
import { EntitySchema } from "typeorm";

export const Tenant = new EntitySchema({
  name: "Tenant",
  tableName: "tenants",
  columns: {
    tenant_id: { primary: true, type: "int", generated: true }, 
    name: { type: "varchar", length: 255 },
    slug: { type: "varchar", length: 255 },
    status: { type: "varchar", length: 32, default: "active" },
    // --- ADDED FOR JIRA INTEGRATION ---
    jira_cloud_id: { 
      type: "varchar", 
      length: 255, 
      nullable: true 
    },
    jira_access_token: { 
      type: "text", 
      nullable: true 
    },
    jira_refresh_token: { 
      type: "text", 
      nullable: true 
    },
    jira_token_expires: { 
      type: "timestamp", 
      nullable: true 
    },
    // ----------------------------------
    created_at: { type: "timestamp", default: () => "CURRENT_TIMESTAMP" },
    updated_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP",
    },
  },
  relations: {
    user_roles_rel: {
      type: "one-to-many",
      target: "UserRoles",
      inverseSide: "tenant_rel",
    },
    projects_rel: {
      type: "one-to-many",
      target: "Project",
      inverseSide: "tenant_rel", 
    },
    tasks_rel: {
      type: "one-to-many",
      target: "Task",
      inverseSide: "tenant_rel", 
    },
  },
});
