import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

async function copyPostMediaToDraft(
  postMedia: any,
  draftId: string,
  postId: string,
  userId: string,
  supabase: SupabaseClient
) {
  const copiedMedia = [];
  
  for (const mediaFile of postMedia) {
    try {
      const oldPath = mediaFile.storagePath;
      const newPath = oldPath.replace('postmedia/', 'draftmedia/');
      
      console.log('Copying media file:', { from: oldPath, to: newPath });

      // Copy the file to draftmedia location
      const { data: copyData, error: copyError } = await supabase.storage
        .from('postmedia')
        .copy(oldPath, newPath);

      if (copyError) {
        console.error('Error copying file:', copyError);
        // If copy fails, try to download and upload
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('postmedia')
          .download(oldPath);

        if (downloadError || !fileData) {
          console.error('Error downloading file for copy:', downloadError);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('postmedia')
          .upload(newPath, arrayBuffer, {
            contentType: mediaFile.mimeType,
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading file to draftmedia:', uploadError);
          continue;
        }
      }

      // Copy thumbnail if it exists
      let newThumbnailPath = null;
      if (mediaFile.thumbnailPath) {
        const oldThumbnailPath = mediaFile.thumbnailPath;
        const thumbnailNewPath = oldThumbnailPath.replace('postmedia/', 'draftmedia/');
        
        const { error: thumbnailCopyError } = await supabase.storage
          .from('postmedia')
          .copy(oldThumbnailPath, thumbnailNewPath);

        if (!thumbnailCopyError) {
          newThumbnailPath = thumbnailNewPath;
        }
      }

      // Create draft media record
      const draftMedia = await prisma.draftMedia.create({
        data: {
          draftId,
          filename: mediaFile.filename,
          originalName: mediaFile.originalName,
          fileSize: mediaFile.fileSize,
          mimeType: mediaFile.mimeType,
          storagePath: newPath,
          thumbnailPath: newThumbnailPath,
          isVideo: mediaFile.isVideo,
          processingStatus: mediaFile.processingStatus,
          order: mediaFile.order,
        },
      });

      copiedMedia.push(draftMedia);
    } catch (error) {
      console.error('Error copying media file:', error);
    }
  }

  return copiedMedia;
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

    const { postId, userId } = await req.json();

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Missing postId or userId' }, { status: 400 });
    }

    // Fetch post with all related data
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: {
          orderBy: { order: 'asc' }
        },
        linkPreviews: true,
        categories: true,
        subcategories: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify user owns the post
    if (post.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get category and subcategory IDs
    const categoryIds = post.categories.map(cat => cat.id);
    const subcategoryIds = post.subcategories.map(subcat => subcat.id);

    // Create draft with post data
    const draft = await prisma.draft.create({
      data: {
        title: post.title,
        content: post.content || '',
        contentMarkdown: post.contentMarkdown || null,
        contentHtml: post.contentHtml || null,
        contentText: post.contentText || null,
        links: post.links || null,
        primaryLinks: post.primaryLinks || null,
        ownerId: userId,
        categories: categoryIds,
        subcategories: subcategoryIds,
        tags: post.tags || [],
        originalPostId: postId,
      },
      include: {
        owner: { select: { id: true, username: true } },
      },
    });

    // Copy media files from post to draft
    if (post.media && post.media.length > 0) {
      await copyPostMediaToDraft(post.media, draft.id, postId, userId, supabase);
    }

    // Copy link previews from post to draft
    if (post.linkPreviews && post.linkPreviews.length > 0) {
      await Promise.all(post.linkPreviews.map(async (preview: any) => {
        await prisma.draftLinkPreview.create({
          data: {
            draftId: draft.id,
            url: preview.url,
            title: preview.title,
            description: preview.description,
            imageUrl: preview.imageUrl,
            domain: preview.domain,
            faviconUrl: preview.faviconUrl,
            isVideo: preview.isVideo || false,
            embedUrl: preview.embedUrl || null,
            platform: preview.platform || null,
            author: preview.author || null,
            site: preview.site || null,
          },
        });
      }));
    }

    // Fetch the created draft with all related data
    const createdDraft = await prisma.draft.findUnique({
      where: { id: draft.id },
      include: {
        owner: { select: { id: true, username: true } },
        media: {
          orderBy: { order: 'asc' }
        },
        linkPreviews: true,
        collaborators: {
          include: {
            user: { select: { id: true, username: true } }
          }
        },
      },
    });

    // Format collaborators info
    const collaboratorsInfo = createdDraft?.collaborators.map(c => ({
      id: c.user.id,
      username: c.user.username,
    })) || [];

    return NextResponse.json({
      draft: {
        ...createdDraft,
        collaboratorsInfo,
      }
    });
  } catch (error) {
    console.error('Error creating draft from post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create draft from post', message: errorMessage },
      { status: 500 }
    );
  }
}

