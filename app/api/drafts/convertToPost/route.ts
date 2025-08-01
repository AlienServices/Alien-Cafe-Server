import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

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
  try {
    const data = await req.json();
    const {
      draftId,
      userId,
      title,
      content,
      primaryLinks,
      links,
      tags,
      categoryIds,
      subCategoryIds,
      linkPreviews
    } = data;

    console.log('Converting draft to post:', { draftId, userId });

    if (!draftId || !userId) {
      return NextResponse.json({ error: 'Missing draftId or userId' }, { status: 400 });
    }

    // Check if user owns the draft
    const draft = await prisma.draft.findFirst({
      where: { id: draftId, ownerId: userId },
      include: { media: true }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    console.log('Found draft with media:', { mediaCount: draft.media.length });

    // Create the post
    const post = await prisma.post.create({
      data: {
        thesis: title,
        content: content,
        primaryLinks: primaryLinks,
        links: links,
        tags: tags,
        title: title,
        email: '', // Drafts don't have email
        userId: userId,
        votes: 0,
        likes: [],
        date: new Date(),
        yesAction: '',
        noAction: '',
        maybeAction: '',
        probablyNoAction: '',
        probablyYesAction: '',
        categories: {
          connect: categoryIds.map((id: string) => ({ id }))
        },
        subcategories: subCategoryIds && Array.isArray(subCategoryIds)
          ? { connect: subCategoryIds.map((id: string) => ({ id })) }
          : undefined,
        // Create link previews if provided
        linkPreviews: linkPreviews && Array.isArray(linkPreviews)
          ? {
              create: linkPreviews.map((preview: any) => ({
                url: preview.url,
                title: preview.title,
                description: preview.description,
                imageUrl: preview.imageUrl,
                domain: preview.domain,
                faviconUrl: preview.faviconUrl
              }))
            }
          : undefined
      },
      include: {
        categories: true,
        owner: true,
        subcategories: true,
        linkPreviews: true
      }
    });

    console.log('Post created successfully:', post.id);

    // Migrate media files from draft to post
    if (draft.media.length > 0) {
      console.log('Migrating media files:', draft.media.length);
      
      for (const draftMedia of draft.media) {
        try {
          // Copy file from draftmedia to postmedia in Supabase storage
          const oldPath = draftMedia.storagePath;
          const newPath = oldPath.replace('draftmedia/', 'postmedia/');
          
          console.log('Moving file:', { from: oldPath, to: newPath });

          // Download the file from old location
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('postmedia')
            .download(oldPath);

          if (downloadError) {
            console.error('Error downloading file:', downloadError);
            continue;
          }

          // Upload to new location
          const { error: uploadError } = await supabase.storage
            .from('postmedia')
            .upload(newPath, fileData, {
              contentType: draftMedia.mimeType,
              metadata: {
                postId: post.id,
                userId: userId,
                originalName: draftMedia.originalName,
                fileSize: draftMedia.fileSize.toString()
              }
            });

          if (uploadError) {
            console.error('Error uploading file to new location:', uploadError);
            continue;
          }

          // Copy thumbnail if it exists
          let newThumbnailPath = null;
          if (draftMedia.thumbnailPath) {
            const oldThumbnailPath = draftMedia.thumbnailPath;
            const thumbnailNewPath = oldThumbnailPath.replace('draftmedia/', 'postmedia/');
            
            const { data: thumbnailData, error: thumbnailDownloadError } = await supabase.storage
              .from('postmedia')
              .download(oldThumbnailPath);

            if (!thumbnailDownloadError && thumbnailData) {
              const { error: thumbnailUploadError } = await supabase.storage
                .from('postmedia')
                .upload(thumbnailNewPath, thumbnailData, {
                  contentType: 'image/jpeg',
                  metadata: {
                    postId: post.id,
                    userId: userId,
                    isThumbnail: 'true'
                  }
                });

              if (!thumbnailUploadError) {
                newThumbnailPath = thumbnailNewPath;
              }
            }
          }

          // Create post media record
          await prisma.postMedia.create({
            data: {
              postId: post.id,
              filename: draftMedia.filename,
              originalName: draftMedia.originalName,
              fileSize: draftMedia.fileSize,
              mimeType: draftMedia.mimeType,
              storagePath: newPath,
              thumbnailPath: newThumbnailPath,
              isVideo: draftMedia.isVideo,
              processingStatus: 'completed',
              order: draftMedia.order
            }
          });

          console.log('Media migrated successfully:', { filename: draftMedia.filename });

        } catch (error) {
          console.error('Error migrating media file:', error);
          // Continue with other files even if one fails
        }
      }
    }

    // Delete the draft and its media records
    await prisma.draftMedia.deleteMany({
      where: { draftId }
    });

    await prisma.draftCollaborator.deleteMany({
      where: { draftId }
    });

    await prisma.draft.delete({
      where: { id: draftId }
    });

    console.log('Draft deleted successfully');

    return NextResponse.json({
      success: true,
      postId: post.id,
      message: 'Draft converted to post successfully'
    });

  } catch (error) {
    console.error('Error converting draft to post:', error);
    return NextResponse.json(
      { error: 'Failed to convert draft to post' },
      { status: 500 }
    );
  }
} 