import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const authPassword = process.env.AUTH_PASSWORD;
  const authEmail = process.env.AUTH_EMAIL || 'admin@studycore.com';

  if (email === authEmail && password === authPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60,
    });
    return response;
  }
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
