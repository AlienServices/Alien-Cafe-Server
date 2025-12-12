import { createClient } from "@supabase/supabase-js";
import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';

// Configure route for metadata processing
export const runtime = 'nodejs';
export const maxDuration = 60;

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

interface MediaMetadata {
  storagePath: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  isVideo: boolean;
  order: number;
  thumbnailPath?: string | null;
}

export async function POST(req: NextRequest) {
  console.log("Processing draft media metadata");
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { draftId, userId, mediaMetadata } = body;

    console.log("Received metadata:", { draftId, userId, mediaCount: mediaMetadata?.length || 0 });

    if (!draftId || !userId) {
      console.error("Missing draftId or userId:", { draftId, userId });
      return NextResponse.json(
        { error: "Missing draftId or userId" },
        { status: 400 }
      );
    }

    if (!mediaMetadata || !Array.isArray(mediaMetadata) || mediaMetadata.length === 0) {
      return NextResponse.json(
        { error: "No media metadata provided" },
        { status: 400 }
      );
    }

    // Check if draft exists and user owns it
    console.log("Looking for draft:", { draftId, userId });
    const draft = await prisma.draft.findFirst({
      where: { id: draftId, ownerId: userId }
    });

    console.log("Draft lookup result:", draft);

    if (!draft) {
      console.error("Draft not found or unauthorized:", { draftId, userId });
      return NextResponse.json(
        { error: "Draft not found or unauthorized" },
        { status: 404 }
      );
    }

    const uploadedMedia = [];
    let order = 0;

    for (const metadata of mediaMetadata as MediaMetadata[]) {
      const { storagePath, originalName, fileSize, mimeType, isVideo, thumbnailPath } = metadata;

      if (!storagePath || !originalName || !mimeType) {
        console.error("Invalid metadata:", metadata);
        continue; // Skip invalid entries
      }

      // Validate file type
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/x-quicktime', 'video/avi', 'video/wmv', 'video/webm'];
      const isValidImage = allowedImageTypes.includes(mimeType);
      const isValidVideo = allowedVideoTypes.includes(mimeType);

      if (!isValidImage && !isValidVideo) {
        console.error(`Unsupported file type: ${mimeType} for ${originalName}`);
        continue; // Skip unsupported types
      }

      // Enforce one video per draft rule
      if (isValidVideo && isVideo) {
        const existingVideo = await prisma.draftMedia.findFirst({
          where: {
            draftId,
            isVideo: true
          }
        });

        if (existingVideo) {
          // Check if this is the same video (same storagePath) - if so, we'll handle it in the duplicate check below
          // If it's a different video, skip it to enforce one video per draft
          if (existingVideo.storagePath !== storagePath) {
            console.warn(`Draft already has a video (${existingVideo.storagePath}), skipping additional video: ${storagePath}`);
            continue; // Skip this video
          }
        }
      }

      // Verify file exists in storage (optional check)
      const { data: fileData, error: fileError } = await supabase.storage
        .from("postmedia")
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          limit: 1,
          search: storagePath.split('/').pop()
        });

      if (fileError && fileError.message !== 'The resource was not found') {
        console.warn(`Could not verify file existence for ${storagePath}:`, fileError.message);
        // Continue anyway - file might exist but list might fail
      }

      // Check if media with this storagePath already exists for this draft
      // This prevents duplicates if registerMediaMetadata is called multiple times
      const existingMedia = await prisma.draftMedia.findFirst({
        where: {
          draftId,
          storagePath
        }
      });

      let mediaRecord;
      
      if (existingMedia) {
        // Media already exists, skip creating duplicate
        console.log("Draft media record already exists, skipping duplicate:", {
          draftId,
          storagePath,
          existingId: existingMedia.id
        });
        mediaRecord = existingMedia;
      } else {
        // Extract filename from storage path (without extension for database)
        const filename = storagePath.split('/').pop()?.split('.')[0] || 
                        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store metadata in database
        console.log("Creating draft media record:", {
          draftId,
          filename,
          originalName,
          fileSize,
          mimeType,
          storagePath,
          thumbnailPath,
          isVideo,
          order
        });
        
        mediaRecord = await prisma.draftMedia.create({
          data: {
            draftId,
            filename,
            originalName,
            fileSize: fileSize || 0,
            mimeType,
            storagePath,
            thumbnailPath: thumbnailPath || null,
            isVideo: isVideo || false,
            order: metadata.order !== undefined ? metadata.order : order++,
            processingStatus: 'completed'
          }
        });
        
        console.log("Draft media record created:", mediaRecord);
      }

      uploadedMedia.push({
        id: mediaRecord.id,
        filename: mediaRecord.filename,
        originalName: mediaRecord.originalName,
        mimeType: mediaRecord.mimeType,
        isVideo: mediaRecord.isVideo,
        thumbnailPath: mediaRecord.thumbnailPath,
        order: mediaRecord.order
      });
    }

    return NextResponse.json({
      success: true,
      media: uploadedMedia,
      message: `Successfully processed ${uploadedMedia.length} media file(s)`
    });

  } catch (error) {
    console.error("Draft media metadata processing error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
