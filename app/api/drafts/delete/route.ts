import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const { draftId, userId } = await req.json();
    if (!draftId || !userId) {
      return NextResponse.json({ error: 'Missing draftId or userId' }, { status: 400 });
    }
    
    // Check if user is owner and get draft with media
    const draft = await prisma.draft.findFirst({
      where: { id: draftId, ownerId: userId },
      include: { media: true }
    });
    
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    console.log('Deleting draft with media:', { mediaCount: draft.media.length });

    // Delete media files from Supabase storage
    if (draft.media.length > 0) {
      for (const media of draft.media) {
        try {
          // Delete main file
          const { error: fileError } = await supabase.storage
            .from('postmedia')
            .remove([media.storagePath]);

          if (fileError) {
            console.error('Error deleting file:', fileError);
          }

          // Delete thumbnail if it exists
          if (media.thumbnailPath) {
            const { error: thumbnailError } = await supabase.storage
              .from('postmedia')
              .remove([media.thumbnailPath]);

            if (thumbnailError) {
              console.error('Error deleting thumbnail:', thumbnailError);
            }
          }
        } catch (error) {
          console.error('Error deleting media file:', error);
        }
      }
    }

    // Delete collaborators first
    await prisma.draftCollaborator.deleteMany({
      where: { draftId },
    });

    // Delete media records
    await prisma.draftMedia.deleteMany({
      where: { draftId }
    });

    // Delete the draft
    await prisma.draft.delete({ where: { id: draftId } });
    
    return NextResponse.json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
} 