import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";


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
    
    // First check if user is the owner
    const draftAsOwner = await prisma.draft.findFirst({
      where: { id: draftId, ownerId: userId },
      include: { media: true }
    });
    
    if (draftAsOwner) {
      // User is the owner - delete entire draft
      console.log('User is owner, deleting entire draft with media:', { mediaCount: draftAsOwner.media.length });

      // Delete media files from Supabase storage
      if (draftAsOwner.media.length > 0) {
        for (const media of draftAsOwner.media) {
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
      
      return NextResponse.json({ message: 'Draft deleted', action: 'deleted' });
    }
    
    // User is not owner - check if they are a collaborator
    const draftAsCollaborator = await prisma.draft.findFirst({
      where: { 
        id: draftId,
        collaborators: { some: { userId } }
      }
    });
    
    if (draftAsCollaborator) {
      // User is a collaborator - remove them as collaborator only
      console.log('User is collaborator, removing from draft:', { draftId, userId });
      
      await prisma.draftCollaborator.deleteMany({
        where: { 
          draftId,
          userId 
        },
      });
      
      return NextResponse.json({ message: 'Removed from draft', action: 'removed' });
    }
    
    // User is neither owner nor collaborator
    return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    
  } catch (error) {
    console.error('Error processing draft action:', error);
    return NextResponse.json({ error: 'Failed to process draft action' }, { status: 500 });
  }
} 
