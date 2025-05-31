import { NextResponse } from 'next/server';

import LoginService from '@/app/services/login/loginService';
import { signToken } from '@/app/lib/auth';

const loginService = new LoginService();

export async function POST(req) {
    try {
        const { email, password, role } = await req.json();
        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 });
        }
        const user = await loginService.validateUser(email, password, role);
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        console.log("Calling for signing");
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        return NextResponse.json({ message: 'Login successful', token }, { status: 200 });
    }catch (error) {
        return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
    }
}