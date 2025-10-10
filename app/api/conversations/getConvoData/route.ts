import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
    // Get the 'ids' parameter from the query string and split it into an array
    const ids = req.nextUrl.searchParams.get('ids')?.split(',') || [];    
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
        // Step 2: Group messages by conversationId
        type MessageGroup = Record<string, typeof messages>;
        const groupedMessages: MessageGroup = messages.reduce((groups, message) => {
            if (!groups[message.conversationId]) {
                groups[message.conversationId] = [];
            }
            groups[message.conversationId].push(message);
            return groups;
        }, {} as MessageGroup);

        // Step 3: Extract the last message from each group
        const lastMessages = Object.values(groupedMessages).map(group => group[group.length - 1]);        
        return NextResponse.json({ Posts: lastMessages });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
