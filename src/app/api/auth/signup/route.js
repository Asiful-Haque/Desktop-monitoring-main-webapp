import SignupService from '@/app/services/signup/signupService';
import { NextResponse } from 'next/server';

const signupService = new SignupService();

export async function POST(req) {
  try {
    const {fullName, email, password, role } = await req.json();

    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: 'fullName, email, password, and role are required' },
        { status: 400 }
      );
    }

    const userExists = await signupService.checkUserExists(email);
    if (userExists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    await signupService.createUser(fullName, email, password, role);
    return NextResponse.json(
      { message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 });
  }
}
