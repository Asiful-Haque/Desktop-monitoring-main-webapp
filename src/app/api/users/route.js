import UsersService from '@/app/services/users/usersService';
import { NextResponse } from 'next/server';

const usersService = new UsersService();

export async function GET() {
    try {
        const users = await usersService.getAllUsers();
        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
