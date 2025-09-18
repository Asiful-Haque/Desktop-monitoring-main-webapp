
import { UsersService } from '@/app/services/users/usersService';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getAuthFromCookie } from '@/app/lib/auth-server';

const usersService = new UsersService();

export async function GET(req) {
  try {
    console.log("Its called ............................from electron............");
    const token = await getAuthFromCookie(req);
    if (!token) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("Token in GET users/route.js:", token);
    const users = await usersService.getUsers(token.tenant_id);
    console.log("It got .................", users);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    // Ensure that the cookies are correctly read and awaited
    const auth = await getAuthFromCookie(req); 
    if (!auth) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('Auth from Cookie:---------route.js---------------------', auth); // Debug log
    
    const { username, email, role, password } = await request.json();
    if (!username || !email || !role || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const newUser = await usersService.createUser(username, email, role, password, auth.tenant_id);
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
