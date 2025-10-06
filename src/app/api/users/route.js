import { UsersService } from '@/app/services/users/usersService';
import { NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/app/lib/auth-server';

const usersService = new UsersService();

export async function GET(req) {
  try {
    // console.log("Its called ............................from electron............");
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.log("Token in GET users/route.js:", auth);
    const users = await usersService.getUsers(auth.tenant_id);
    // console.log("It got .................", users);
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
    // console.log('Auth from Cookie:---------route.js---------------------', auth);

    const { username, email, role, password, default_hour_rate } = await request.json();

    if (!username || !email || !role || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    let rate;
    if (default_hour_rate !== undefined && default_hour_rate !== null && default_hour_rate !== '') {
      const parsed = Number(default_hour_rate);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json({ message: 'default_hour_rate must be a non-negative number' }, { status: 400 });
      }
      rate = Math.round(parsed * 100) / 100;
    }

    const newUser = await usersService.createUser(
      username,
      email,
      role,
      password,
      auth.tenant_id,
      rate 
    );

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}
