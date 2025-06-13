import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import admin from '../../../../lib/firebaseAdmin';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log('Test notification requested for userId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get all device tokens for the user
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId }
    });
    console.log('Found device tokens:', deviceTokens);

    if (deviceTokens.length === 0) {
      return NextResponse.json({ error: 'No device tokens found for user' }, { status: 404 });
    }

    // Send test notification to all user's devices
    const results = await Promise.all(deviceTokens.map(async (dt) => {
      console.log('Processing device token:', {
        token: dt.token,
        platform: dt.platform,
        tokenLength: dt.token.length
      });

      const message = {
        token: dt.token,
        notification: {
          title: 'Test Notification',
          body: 'This is a test push notification from Alien Cafe!'
        },
        data: {
          type: 'test',
          platform: dt.platform
        },
        // Add platform-specific configuration
        ...(dt.platform === 'ios' ? {
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        } : {})
      };

      try {
        console.log('Sending message to Firebase:', JSON.stringify(message, null, 2));
        const response = await admin.messaging().send(message);
        console.log('Firebase response:', response);
        return { success: true, response };
      } catch (error: any) {
        console.error('Error sending to device:', {
          token: dt.token,
          platform: dt.platform,
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details
        });
        return { 
          success: false, 
          error: error.message,
          token: dt.token,
          platform: dt.platform
        };
      }
    }));

    return NextResponse.json({ 
      success: true, 
      message: `Test notification sent to ${deviceTokens.length} device(s)`,
      results 
    });
  } catch (error: any) {
    console.error('Error in test notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 