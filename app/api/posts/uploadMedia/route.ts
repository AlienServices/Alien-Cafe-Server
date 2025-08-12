import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
import sharp from "sharp";

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: NextRequest) {
  console.log("Uploading media");
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const postId = formData.get('postId') as string;
    const userId = formData.get('userId') as string;

    if (!postId || !userId) {
      return NextResponse.json(
        { error: "Missing postId or userId" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Check if post exists and user owns it
    const post = await prisma.post.findFirst({
      where: { id: postId, userId: userId }
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 }
      );
    }

    const uploadedMedia = [];
    let order = 0;

    for (const file of files) {
      // Validate file type
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/webm'];
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
      const storagePath = `postmedia/${postId}/${filename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("postmedia")
        .upload(storagePath, file, {
          contentType: file.type,
          metadata: {
            postId,
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
          const thumbnailStoragePath = `postmedia/${postId}/thumbnails/${thumbnailFilename}`;

          const { error: thumbnailError } = await supabase.storage
            .from("postmedia")
            .upload(thumbnailStoragePath, thumbnailBuffer, {
              contentType: 'image/jpeg',
              metadata: {
                postId,
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
      const mediaRecord = await prisma.postMedia.create({
        data: {
          postId,
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
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 