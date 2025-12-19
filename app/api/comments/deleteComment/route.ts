import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function POST(req: NextRequest) {
    const data = await req.json()    
    try {
        const id = data.id || '';
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // Soft-delete the comment AND all descendants (replies) using a recursive CTE.
        // This matches the existing client behavior (deleting a comment removes its replies).
        await prisma.$executeRaw`
            WITH RECURSIVE descendants AS (
                SELECT id FROM "Comment" WHERE id = ${id}
                UNION ALL
                SELECT c.id
                FROM "Comment" c
                INNER JOIN descendants d
                  ON c."parent_comment_id" = d.id
            )
            UPDATE "Comment"
               SET "deleted_at" = CURRENT_TIMESTAMP
             WHERE id IN (SELECT id FROM descendants);
        `;

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}   

/////
