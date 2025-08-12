import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Helper function for fallback file migration
async function fallbackFileMigration(mediaFile: any, newPath: string, postId: string, userId: string) {
  try {
    console.log('Using fallback migration for file:', mediaFile.originalName);
    
    // Download the file from old location
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('postmedia')
      .download(mediaFile.storagePath);

    if (downloadError) {
      console.error('Error downloading file in fallback:', downloadError);
      return false;
    }

    // Upload to new location
    const { error: uploadError } = await supabase.storage
      .from('postmedia')
      .upload(newPath, fileData, {
        contentType: mediaFile.mimeType || 'application/octet-stream',
        metadata: {
          postId: postId,
          userId: userId,
          originalName: mediaFile.originalName || 'unknown',
          fileSize: (mediaFile.fileSize || 0).toString()
        }
      });

    if (uploadError) {
      console.error('Error uploading file in fallback:', uploadError);
      return false;
    }

    console.log('Fallback migration successful for file:', mediaFile.originalName);
    return true;
  } catch (error) {
    console.error('Error in fallback migration:', error);
    return false;
  }
}

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
    const body = await req.json();
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
      linkPreviews,
      mediaFiles
    } = body;

    if (!draftId || !userId || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Converting draft to post:', { draftId, userId, title, mediaFilesCount: mediaFiles?.length || 0 });

    // Get the draft
    const draft = await prisma.draft.findFirst({
      where: { id: draftId, ownerId: userId },
      include: {
        media: true,
        collaborators: true
      }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

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

    // Migrate media files from draft to post using the provided mediaFiles
    if (mediaFiles && mediaFiles.length > 0) {
      console.log('Migrating media files:', mediaFiles.length);
      
      for (const mediaFile of mediaFiles) {
        try {
          // If the media file has a storagePath (from server), migrate it
          if (mediaFile.storagePath) {
            const oldPath = mediaFile.storagePath;
            const newPath = oldPath.replace('draftmedia/', 'postmedia/');
            
            console.log('Migrating file:', { from: oldPath, to: newPath });

            // Check if file exists at old path
            const { data: fileExists } = await supabase.storage
              .from('postmedia')
              .list(oldPath.split('/').slice(0, -1).join('/'), {
                search: oldPath.split('/').pop()
              });

            if (!fileExists || fileExists.length === 0) {
              console.error('File not found at old path:', oldPath);
              continue;
            }

            // Try to rename the file in storage (more efficient than download/upload)
            try {
              // First, try to copy to new location
              const { data: copyData, error: copyError } = await supabase.storage
                .from('postmedia')
                .copy(oldPath, newPath);

              if (copyError) {
                console.error('Error copying file:', copyError);
                // Fallback to download/upload if copy fails
                await fallbackFileMigration(mediaFile, newPath, post.id, userId);
              } else {
                console.log('File copied successfully to new location');
                
                // Delete the old file
                const { error: deleteError } = await supabase.storage
                  .from('postmedia')
                  .remove([oldPath]);
                
                if (deleteError) {
                  console.error('Error deleting old file:', deleteError);
                }
              }
            } catch (error) {
              console.error('Error during file copy, falling back to download/upload:', error);
              await fallbackFileMigration(mediaFile, newPath, post.id, userId);
            }

            // Handle thumbnail migration
            let newThumbnailPath = null;
            if (mediaFile.thumbnailPath) {
              const oldThumbnailPath = mediaFile.thumbnailPath;
              const thumbnailNewPath = oldThumbnailPath.replace('draftmedia/', 'postmedia/');
              
              try {
                const { data: thumbnailCopyData, error: thumbnailCopyError } = await supabase.storage
                  .from('postmedia')
                  .copy(oldThumbnailPath, thumbnailNewPath);

                if (!thumbnailCopyError) {
                  newThumbnailPath = thumbnailNewPath;
                  
                  // Delete old thumbnail
                  await supabase.storage
                    .from('postmedia')
                    .remove([oldThumbnailPath]);
                }
              } catch (error) {
                console.error('Error migrating thumbnail:', error);
              }
            }

            // Create post media record
            await prisma.postMedia.create({
              data: {
                postId: post.id,
                filename: mediaFile.filename || mediaFile.id,
                originalName: mediaFile.originalName || 'unknown',
                fileSize: mediaFile.fileSize || 0,
                mimeType: mediaFile.mimeType || 'application/octet-stream',
                storagePath: newPath,
                thumbnailPath: newThumbnailPath,
                isVideo: mediaFile.isVideo || false,
                processingStatus: 'completed',
                order: mediaFile.order || 0
              }
            });

            console.log('Media migrated successfully:', { filename: mediaFile.filename || mediaFile.id });
          }
          // If the media file has an actual File object, upload it directly
          else if (mediaFile.file) {
            console.log('Uploading new media file:', mediaFile.file.name);
            
            // This will be handled by the frontend after post creation
            // The frontend will call the uploadMedia endpoint
          }
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