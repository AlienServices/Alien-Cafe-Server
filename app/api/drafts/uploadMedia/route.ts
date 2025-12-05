import { createClient } from "@supabase/supabase-js";
import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';
import sharp from "sharp";


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

export async function POST(req: NextRequest) {
  console.log("Uploading draft media");
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const draftId = formData.get('draftId') as string;
    const userId = formData.get('userId') as string;

    console.log("Received data:", { draftId, userId, filesCount: files.length });
    console.log("Files details:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    console.log("FormData keys:", Array.from(formData.keys()));

    if (!draftId || !userId) {
      console.error("Missing draftId or userId:", { draftId, userId });
      return NextResponse.json(
        { error: "Missing draftId or userId" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
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

    for (const file of files) {
      // Validate file type
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/x-quicktime', 'video/avi', 'video/wmv', 'video/webm'];
      const isImage = allowedImageTypes.includes(file.type);
      const isVideo = allowedVideoTypes.includes(file.type);

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}` },
          { status: 400 }
        );
      }

      // Check file size (2GB limit)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const filename = `${uniqueId}.${fileExtension}`;
      const storagePath = `draftmedia/${draftId}/${filename}`;

      // Upload to Supabase Storage
      console.log("Attempting upload to postmedia bucket:", { storagePath, fileSize: file.size, fileType: file.type });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("postmedia")
        .upload(storagePath, file, {
          contentType: file.type,
          metadata: {
            draftId,
            userId,
            originalName: file.name,
            fileSize: file.size.toString()
          }
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      console.log("Upload successful:", { storagePath, uploadData });
      
      // Log the public URL for verification
      const { data: publicUrl } = supabase.storage
        .from("postmedia")
        .getPublicUrl(storagePath);
      console.log("Public URL:", publicUrl.publicUrl);

      let thumbnailPath = null;

      // Generate thumbnail for images
      if (isImage) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const thumbnailBuffer = await sharp(buffer)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();

          const thumbnailFilename = `thumb-${uniqueId}.jpg`;
          const thumbnailStoragePath = `draftmedia/${draftId}/thumbnails/${thumbnailFilename}`;

          const { error: thumbnailError } = await supabase.storage
            .from("postmedia")
            .upload(thumbnailStoragePath, thumbnailBuffer, {
              contentType: 'image/jpeg',
              metadata: {
                draftId,
                userId,
                isThumbnail: 'true'
              }
            });

          if (!thumbnailError) {
            thumbnailPath = thumbnailStoragePath;
          }
        } catch (thumbnailError) {
          console.error("Thumbnail generation error:", thumbnailError);
          // Continue without thumbnail
        }
      }

      // Store metadata in database
      console.log("Creating draft media record:", {
        draftId,
        filename: uniqueId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storagePath,
        thumbnailPath,
        isVideo: isVideo,
        order: order
      });
      
      const mediaRecord = await prisma.draftMedia.create({
        data: {
          draftId,
          filename: uniqueId,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          storagePath,
          thumbnailPath,
          isVideo: isVideo,
          order: order++,
          processingStatus: 'completed'
        }
      });
      
      console.log("Draft media record created:", mediaRecord);

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
      message: `Successfully uploaded ${uploadedMedia.length} file(s)`
    });

  } catch (error) {
    console.error("Draft media upload error:", error);
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
