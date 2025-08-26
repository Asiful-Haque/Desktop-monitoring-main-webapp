
import { getAuthFromCookie } from '@/app/lib/auth-server';
import { UsersService } from '@/app/services/users/usersService';
import { NextResponse } from 'next/server';


const usersService = new UsersService();

export async function GET() {
    try {
        const users = await usersService.getUsers();
        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const auth = await getAuthFromCookie();           
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { username, email, role, password } = await request.json();
        if (!username || !email || !role || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const newUser = await usersService.createUser(username, email, role, password, auth.tenant_id);
        return NextResponse.json({ user: newUser }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
