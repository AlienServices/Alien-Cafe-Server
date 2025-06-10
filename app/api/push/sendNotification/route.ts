import { NextRequest, NextResponse } from 'next/server';
// import admin from '../../../../lib/firebaseAdmin';

// This tells Next.js to handle this route dynamically
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // TODO: Implement Firebase notification logic later
  return NextResponse.json({ success: true, message: 'Notification endpoint temporarily disabled' });
  
  /* Original implementation commented out for now
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { token, title, body: messageBody, data } = body;

    if (!token || !title || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = {
      token,
      notification: {
        title,
        body: messageBody,
      },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('Error in sendNotification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  */
} 