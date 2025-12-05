import { UsersService } from '@/app/services/users/usersService';
import { NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/app/lib/auth-server';

const usersService = new UsersService();

export async function GET(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = await usersService.getUsers(auth.tenant_id);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      username,
      email,
      role,
      password,
      default_hour_rate,
      salary_type,
      currency, 
    } = await request.json();

    if (!username || !email || !role || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }
    let normalizedCurrency = null;
    if (currency !== undefined && currency !== null && String(currency).trim() !== "") {
      const c = String(currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) {
        return NextResponse.json(
          { message: "currency must be a valid ISO 4217 code (3 letters), e.g. USD, EUR, BDT" },
          { status: 400 }
        );
      }
      normalizedCurrency = c;
    }
    let rate;
    if (default_hour_rate !== undefined && default_hour_rate !== null && default_hour_rate !== "") {
      const parsed = Number(default_hour_rate);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json(
          { message: "default_hour_rate must be a non-negative number" },
          { status: 400 }
        );
      }
      rate = Math.round(parsed * 100) / 100;
    }
    const isFreelancer = role === "Freelancer";
    let normalizedSalaryType = null;
    if (!isFreelancer) {
      const allowed = ["Weekly", "Monthly"];
      if (!salary_type || !allowed.includes(salary_type)) {
        return NextResponse.json(
          { message: "salary_type is required and must be one of: Weekly, Monthly" },
          { status: 400 }
        );
      }
      normalizedSalaryType = salary_type;
    }
    const newUser = await usersService.createUser(
      username,
      email,
      role,
      password,
      auth.tenant_id,
      rate,
      normalizedSalaryType,
      normalizedCurrency 
    );
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
  }
}
