import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';
import { calculateAverageVoteScore } from '@/app/utils/voteUtils';
import { createClient } from '@supabase/supabase-js';

const MAX_NEXUS_POSTS = 100;

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const email = searchParams.get('email');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!email) {
        return NextResponse.json(
            { error: 'Email parameter is required' },
            { status: 400 }
        );
    }

    try {
        // Get user ID from email
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get user's priority categories from Supabase
        const supabase = getSupabase();
        if (!supabase) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const { data: categorySettings, error: settingsError } = await supabase
            .from('user_category_settings')
            .select('category_name, setting')
            .eq('user_id', user.id);

        if (settingsError) {
            console.error('Error fetching user category settings:', settingsError);
            return NextResponse.json(
                { error: 'Failed to fetch user category settings' },
                { status: 500 }
            );
        }

        // Filter to only get priority categories (exclude 'default' and 'exclude' settings)
        const prioritySettings = categorySettings?.filter(item => item.setting === 'priority') || [];
        
        // Log for debugging
        console.log(`[Nexus API] User ${user.id} priority categories:`, prioritySettings.map(s => s.category_name));

        // If user has no priority categories, return empty result
        if (!prioritySettings || prioritySettings.length === 0) {
            console.log(`[Nexus API] No priority categories found for user ${user.id}`);
            return NextResponse.json({
                posts: [],
                page,
                limit: 0,
                total: 0,
                hasMore: false,
            });
        }

        // Get category IDs from category names
        const priorityCategoryNames = prioritySettings.map(item => item.category_name);
        console.log('priorityCategoryNames', priorityCategoryNames);
        const categories = await prisma.category.findMany({
            where: {
                name: {
                    in: priorityCategoryNames,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                name: true
            }
        });

        const priorityCategoryIds = categories.map(cat => cat.id);

        if (priorityCategoryIds.length === 0) {
            return NextResponse.json({
                posts: [],
                page,
                limit: 0,
                total: 0,
                hasMore: false,
            });
        }

        // Fetch top 100 newest posts from priority categories
        const maxLimit = Math.min(limit, MAX_NEXUS_POSTS);
        const skip = Math.min((page - 1) * maxLimit, MAX_NEXUS_POSTS);
        
        // Calculate how many posts we can still fetch (remaining from 100)
        const remaining = Math.max(0, MAX_NEXUS_POSTS - skip);
        const actualLimit = Math.min(maxLimit, remaining);

        // Get total count (capped at MAX_NEXUS_POSTS)
        const totalCount = await prisma.post.count({
            where: {
                categories: {
                    some: {
                        id: {
                            in: priorityCategoryIds
                        }
                    }
                }
            }
        });
        const total = Math.min(totalCount, MAX_NEXUS_POSTS);

        // If we've already fetched all 100 posts, return empty array
        if (actualLimit <= 0 || remaining <= 0) {
            return NextResponse.json({
                posts: [],
                page,
                limit: 0,
                total,
                hasMore: false,
            });
        }

        // Fetch posts from priority categories, ordered by date (newest first), limited to actualLimit
        // Posts are filtered to only include those in the user's priority categories
        // Using 'some' means a post will be included if it has AT LEAST ONE category in the priority list
        // and sorted from newest to oldest based on the date field
        const posts = await prisma.post.findMany({
            where: {
                categories: {
                    some: {
                        id: {
                            in: priorityCategoryIds
                        }
                    }
                }
            },
            include: {
                owner: true,
                comments: true,
                bookmarks: true,
                categories: {
                    include: {
                        subcategories: true
                    }
                },
                subcategories: true,
                linkPreviews: true,
                media: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: { date: 'desc' }, // Newest posts first
            skip,
            take: actualLimit,
        });

        // Calculate average vote scores for all posts
        const postIds = posts.map(p => p.id);
        const allVotes = postIds.length > 0 ? await prisma.vote.findMany({
            where: {
                postId: { in: postIds }
            },
            select: {
                postId: true,
                vote: true,
                createdAt: true
            }
        }) : [];
        
        // Group votes by postId
        const votesByPostId: Record<string, Array<{ vote: string; createdAt: Date | null }>> = {};
        allVotes.forEach(vote => {
            if (!votesByPostId[vote.postId]) {
                votesByPostId[vote.postId] = [];
            }
            votesByPostId[vote.postId].push({
                vote: vote.vote,
                createdAt: vote.createdAt
            });
        });
        
        // Ensure `subCategories` is always an array and update vote averages
        posts.forEach((post) => {
            (post as any).subCategories = post.subcategories || [];
            // Update votes with calculated average
            (post as any).votes = votesByPostId[post.id] 
                ? calculateAverageVoteScore(votesByPostId[post.id]) 
                : post.votes;
        });
        
        console.log(`[Nexus API] Returning ${posts.length} posts`);
        
        return NextResponse.json({
            posts,
            page,
            limit: actualLimit,
            total: Math.min(total, posts.length + (page - 1) * actualLimit),
            hasMore: skip + posts.length < total,
        });
    } catch (error) {
        console.log('Error fetching Nexus posts:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching Nexus posts' },
            { status: 500 }
        );
    }
}


