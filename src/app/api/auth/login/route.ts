import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password, from } = await req.json()

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth', process.env.SITE_PASSWORD!, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // No maxAge = session cookie (clears on browser close)
  })
  return res
}
