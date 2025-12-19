import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { User } from "@/app/lib/typeorm/entities/User";
import { Tenant } from "@/app/lib/typeorm/entities/Tenant";
import { UserRoles } from "@/app/lib/typeorm/entities/User_Role"; 
import * as bcrypt from "bcrypt";

export class SignupService {
  async registerUser(data) {
    const { 
      username, 
      email, 
      password, 
      companyName, 
      companyType, 
      currencyType, 
      salaryType 
    } = data;

    console.log("Starting registration for:", email);

    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const tenantRepo = ds.getRepository(Tenant);
    const userRolesRepo = ds.getRepository(UserRoles);
    const existingUser = await userRepo.findOne({
      where: { email: email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username: username,
      email: email,
      password: hashedPassword,
      salary_type: salaryType, 
      time_sheet_approval: 1,  
    };

    const savedUser = await userRepo.save(newUser);
    const savedUserId = savedUser.user_id;
    console.log("User saved with ID:", savedUserId);
    const newTenant = {
      name: companyName,
      slug: companyType, 
      status: "active",
    };

    const savedTenant = await tenantRepo.save(newTenant);
    const savedTenantId = savedTenant.tenant_id;
    console.log("Tenant saved with ID:", savedTenantId);
    const newUserRole = {
      user_id: savedUserId,
      tenant_id: savedTenantId,
      role_id: 1, 
      currency: currencyType,
    };

    await userRolesRepo.save(newUserRole);
    console.log("UserRole link created successfully.");
    return {
      user_id: savedUserId,
      username: username,
      email: email,
      role: "Admin", 
      tenant_id: savedTenantId,
      tenant_name: companyName,
      currency: currencyType,
    };
  }
}