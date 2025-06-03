import { NextRequest, NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  const { token, title, body, data } = await req.json();
  if (!token || !title || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {}, // for deep linking, etc.
    };
    const response = await admin.messaging().send(message);
    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 