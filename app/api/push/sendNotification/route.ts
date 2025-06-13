import { NextRequest, NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';

// This tells Next.js to handle this route dynamically
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { token, title, body: messageBody, data, platform } = body;

    if (!token || !title || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = {
      token,
      notification: {
        title,
        body: messageBody,
      },
      data: {
        ...(data || {}),
        platform: platform || 'fcm', // Add platform info to data
      },
      // Add APNs specific configuration if needed
      apns: platform === 'ios' ? {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      } : undefined,
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('Error in sendNotification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 