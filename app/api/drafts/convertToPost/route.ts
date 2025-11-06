import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { log } from 'console';


// Helper function for fallback file migration
async function fallbackFileMigration(
  mediaFile: any,
  newPath: string,
  postId: string,
  userId: string,
  supabase: SupabaseClient
) {
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

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const body = await req.json();
    const { 
      draftId, 
      userId, 
      title, 
      content, 
      contentMarkdown,
      primaryLinks, 
      links, 
      tags, 
      categoryIds, 
      subCategoryIds,
      linkPreviews,
      email,
      yesAction,
      noAction,
      maybeAction,
      probablyYesAction,
      probablyNoAction
    } = body;

    if (!draftId || !userId || !title || (!content && !contentMarkdown)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Converting draft to post:', { draftId, userId, title });
    console.log('yesAction:', yesAction);
    console.log('🎬 Link previews received in convertToPost request:', linkPreviews ? JSON.stringify(linkPreviews.map((p: any) => ({ 
      url: p.url, 
      isVideo: p.isVideo, 
      isVideoType: typeof p.isVideo,
      platform: p.platform 
    })), null, 2) : 'none (will use saved draft link previews)');

    // Get the draft
    const draft = await prisma.draft.findFirst({
      where: { id: draftId, ownerId: userId },
      include: {
        media: true,
        collaborators: true,
        linkPreviews: true // Include link previews for fallback
      }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    // If linkPreviews not provided in request, use saved draft link previews
    const linkPreviewsToUse = linkPreviews || draft.linkPreviews.map((lp: any) => ({
      url: lp.url,
      title: lp.title,
      description: lp.description,
      imageUrl: lp.imageUrl,
      domain: lp.domain,
      faviconUrl: lp.faviconUrl,
      isVideo: lp.isVideo, // Use saved value from database
      embedUrl: lp.embedUrl,
      author: lp.author,
      platform: lp.platform,
      site: lp.site
    }));
    
    console.log('🎬 Link previews to use (request or saved):', JSON.stringify(linkPreviewsToUse.map((p: any) => ({ 
      url: p.url, 
      isVideo: p.isVideo, 
      isVideoType: typeof p.isVideo,
      platform: p.platform 
    })), null, 2));

    // Markdown → HTML → Text pipeline
    const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
    const ALLOWED_TAGS = [
      'p', 'br', 'a', 'strong', 'b', 'em', 'i', 'u', 'img', 'video', 'source'
    ];
    const ALLOWED_ATTR = {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      video: ['src', 'controls'],
      source: ['src', 'type']
    } as Record<string, string[]>;

    const htmlFromMarkdown = contentMarkdown ? md.render(contentMarkdown) : undefined;
    const rawHtml = htmlFromMarkdown ?? content ?? '';
    const sanitizedHtml = sanitizeHtml(rawHtml, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTR,
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
      }
    });
    const textOnly = sanitizeHtml(sanitizedHtml, { allowedTags: [], allowedAttributes: {} }).trim();

    // Check if this is an update to an existing post
    const isUpdate = draft.originalPostId !== null && draft.originalPostId !== undefined;

    let post;
    if (isUpdate) {
      // Update existing post
      console.log('Updating existing post:', draft.originalPostId);
      
      // First, verify the post exists and user owns it
      const existingPost = await prisma.post.findUnique({
        where: { id: draft.originalPostId! },
        include: {
          categories: true,
          subcategories: true,
        }
      });

      if (!existingPost) {
        return NextResponse.json({ error: 'Original post not found' }, { status: 404 });
      }

      if (existingPost.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized to update this post' }, { status: 403 });
      }

      // Delete existing link previews (will recreate them)
      await prisma.linkPreview.deleteMany({
        where: { postId: draft.originalPostId! }
      });

      // Delete existing media (will recreate them from draft media)
      await prisma.postMedia.deleteMany({
        where: { postId: draft.originalPostId! }
      });

      // Disconnect existing categories and subcategories
      await prisma.post.update({
        where: { id: draft.originalPostId! },
        data: {
          categories: {
            set: []
          },
          subcategories: {
            set: []
          }
        }
      });

      // Update the post, preserving ID, date, votes, comments, etc.
      post = await prisma.post.update({
        where: { id: draft.originalPostId! },
        data: {
          thesis: title,
          content: sanitizedHtml,
          contentMarkdown: contentMarkdown ?? null,
          contentHtml: sanitizedHtml,
          contentText: textOnly,
          primaryLinks: primaryLinks,
          links: links,
          tags: tags,
          title: title,
          // Preserve original date
          // Preserve votes, likes, dislikes, voted arrays
          yesAction: yesAction || '',
          noAction: noAction || '',
          maybeAction: maybeAction || '',
          probablyNoAction: probablyNoAction || '',
          probablyYesAction: probablyYesAction || '',
          categories: {
            connect: categoryIds.map((id: string) => ({ id }))
          },
          subcategories: subCategoryIds && Array.isArray(subCategoryIds)
            ? { connect: subCategoryIds.map((id: string) => ({ id })) }
            : undefined,
          // Create new link previews
          linkPreviews: linkPreviewsToUse && Array.isArray(linkPreviewsToUse)
            ? {
                create: linkPreviewsToUse.map((preview: any) => ({
                  url: preview.url,
                  title: preview.title,
                  description: preview.description,
                  imageUrl: preview.imageUrl,
                  domain: preview.domain,
                  faviconUrl: preview.faviconUrl,
                  isVideo: preview.isVideo === true || preview.isVideo === 'true',
                  embedUrl: preview.embedUrl ?? null,
                  author: preview.author ?? null,
                  platform: preview.platform ?? null,
                  site: preview.site ?? null
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

      console.log('Post updated successfully:', post.id);
    } else {
      // Create new post
      post = await prisma.post.create({
        data: {
          thesis: title,
          content: sanitizedHtml, // legacy compatibility
          contentMarkdown: contentMarkdown ?? null,
          contentHtml: sanitizedHtml,
          contentText: textOnly,
          primaryLinks: primaryLinks,
          links: links,
          tags: tags,
          title: title,
          email: email || '', // Use email from request or fallback to empty string
          userId: userId,
          votes: 0,
          likes: [],
          date: new Date(),
          yesAction: yesAction || '',
          noAction: noAction || '',
          maybeAction: maybeAction || '',
          probablyNoAction: probablyNoAction || '',
          probablyYesAction: probablyYesAction || '',
          categories: {
            connect: categoryIds.map((id: string) => ({ id }))
          },
          subcategories: subCategoryIds && Array.isArray(subCategoryIds)
            ? { connect: subCategoryIds.map((id: string) => ({ id })) }
            : undefined,
          // Create link previews if provided
          linkPreviews: linkPreviewsToUse && Array.isArray(linkPreviewsToUse)
            ? {
                create: linkPreviewsToUse.map((preview: any) => {
                  // Debug logging for video detection
                  console.log('🎬 Converting link preview:', {
                    url: preview.url,
                    isVideo: preview.isVideo,
                    isVideoType: typeof preview.isVideo,
                    isVideoStrict: preview.isVideo === true,
                    embedUrl: preview.embedUrl,
                    platform: preview.platform
                  });
                  
                  return {
                    url: preview.url,
                    title: preview.title,
                    description: preview.description,
                    imageUrl: preview.imageUrl,
                    domain: preview.domain,
                    faviconUrl: preview.faviconUrl,
                    isVideo: preview.isVideo === true || preview.isVideo === 'true', // Ensure boolean true is preserved
                    embedUrl: preview.embedUrl ?? null,
                    author: preview.author ?? null,
                    platform: preview.platform ?? null,
                    site: preview.site ?? null
                  };
                })
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
    }

    // Generate search vector for the post
    console.log('=== CREATING SEARCH VECTOR ===')
    const searchableContent = [
        post.title,
        post.content,
        post.links,
        post.primaryLinks,
        post.thesis,
        post.yesAction,
        post.noAction,
        post.maybeAction,
        post.probablyYesAction,
        post.probablyNoAction,
        post.tags?.join(' '),
        Array.isArray(post.categories) ? post.categories.map((cat: any) => cat.name).join(' ') : '',
        Array.isArray(post.subcategories) ? post.subcategories.map((subcat: any) => subcat.name).join(' ') : '',
        post.owner?.username
    ].filter(Boolean).join(' ')

    console.log('Search vector length:', searchableContent.length)
    console.log('Search vector preview:', searchableContent.substring(0, 100) + '...')

    console.log('=== UPDATING POST WITH SEARCH VECTOR ===')
    const updatedPost = await prisma.post.update({
        where: { id: post.id },
        data: {
            searchVector: searchableContent
        },
        include: {
            categories: true,
            owner: true,
            subcategories: true,
            linkPreviews: true
        }
    })

    console.log('=== POST UPDATED WITH SEARCH VECTOR ===')
    console.log('Final post ID:', updatedPost.id)

    // Migrate media files from draft to post using the draft's saved media
    console.log('Draft media:', draft.media);
    if (draft.media && draft.media.length > 0) {
      console.log('Migrating media files from draft:', draft.media.length);
      
      for (const mediaFile of draft.media) {
        try {
          // If the media file has a storagePath (from server), migrate it
          if (mediaFile.storagePath) {
            const oldPath = mediaFile.storagePath;
            let newPath = oldPath;
            
            // Only migrate if path contains draftmedia (new draft from post will already be in postmedia)
            if (oldPath.includes('draftmedia/')) {
              newPath = oldPath.replace('draftmedia/', 'postmedia/');
              
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
                  await fallbackFileMigration(mediaFile, newPath, post.id, userId, supabase);
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
                await fallbackFileMigration(mediaFile, newPath, post.id, userId, supabase);
              }

              // Handle thumbnail migration
              let newThumbnailPath = null;
              if (mediaFile.thumbnailPath) {
                const oldThumbnailPath = mediaFile.thumbnailPath;
                if (oldThumbnailPath.includes('draftmedia/')) {
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
                } else {
                  newThumbnailPath = mediaFile.thumbnailPath;
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
            } else {
              // File already in postmedia (from createFromPost), just create the record
              let newThumbnailPath = mediaFile.thumbnailPath;
              if (mediaFile.thumbnailPath && mediaFile.thumbnailPath.includes('draftmedia/')) {
                // Update thumbnail path if needed
                newThumbnailPath = mediaFile.thumbnailPath.replace('draftmedia/', 'postmedia/');
              }

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

              console.log('Media record created (file already in postmedia):', { filename: mediaFile.filename || mediaFile.id });
            }
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
      postId: updatedPost.id,
      post: updatedPost,
      message: isUpdate ? 'Post updated successfully' : 'Draft converted to post successfully',
      isUpdate: isUpdate
    });

  } catch (error) {
    console.error('Error converting draft to post:', error);
    return NextResponse.json(
      { error: 'Failed to convert draft to post' },
      { status: 500 }
    );
  }
} 
