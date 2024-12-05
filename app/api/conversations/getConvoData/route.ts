import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    // Get the 'ids' parameter from the query string and split it into an array
    const ids = req.nextUrl.searchParams.get('ids')?.split(',') || [];
    console.log(ids, 'this is a test of ids');

    try {
        // Step 1: Query all messages ordered by date
        const messages = await prisma.message.findMany({
            where: {
                conversationId: {
                    in: ids
                }
            },
            orderBy: {
                date: 'asc'
            }            
        });

        console.log(messages, 'all messages retrieved');

        // Step 2: Group messages by conversationId
        const groupedMessages = messages.reduce((groups, message) => {
            if (!groups[message.conversationId]) {
                groups[message.conversationId] = [];
            }
            groups[message.conversationId].push(message);
            return groups;
        }, {});

        // Step 3: Extract the last message from each group
        const lastMessages = Object.values(groupedMessages).map(group => group[group.length - 1]);

        console.log(lastMessages, 'last messages in each group');

        return NextResponse.json({ Posts: lastMessages });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}