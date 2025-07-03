import { NextRequest, NextResponse } from 'next/server';

// Rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Simple cache for link previews
const linkPreviewCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Platform-specific API caches
const xEmbedCache = new Map<string, { data: any; timestamp: number }>();
const telegramCache = new Map<string, { data: any; timestamp: number }>();
const PLATFORM_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Blocked domains (internal/private networks)
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.',
  '192.168.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
];

// Video detection patterns
const VIDEO_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'twitch.tv',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com'
];

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];

function isBlockedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return BLOCKED_DOMAINS.some(blocked => 
      hostname === blocked || hostname.startsWith(blocked)
    );
  } catch {
    return true; // Block if URL parsing fails
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Enhanced HTML parser to extract meta tags including video metadata
function extractMetaTags(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : '';

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const description = descMatch ? descMatch[1].trim() : '';

  const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const favicon = faviconMatch ? faviconMatch[1].trim() : '';

  // Video-specific metadata
  const ogVideoMatch = html.match(/<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogVideo = ogVideoMatch ? ogVideoMatch[1].trim() : '';

  const ogVideoTypeMatch = html.match(/<meta[^>]*property=["']og:video:type["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const ogVideoType = ogVideoTypeMatch ? ogVideoTypeMatch[1].trim() : '';

  const twitterPlayerMatch = html.match(/<meta[^>]*property=["']twitter:player["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const twitterPlayer = twitterPlayerMatch ? twitterPlayerMatch[1].trim() : '';

  const twitterPlayerStreamMatch = html.match(/<meta[^>]*property=["']twitter:player:stream["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const twitterPlayerStream = twitterPlayerStreamMatch ? twitterPlayerStreamMatch[1].trim() : '';

  return {
    title: ogTitle || title,
    description: ogDesc || description,
    imageUrl: ogImage,
    faviconUrl: favicon,
    ogVideo,
    ogVideoType,
    twitterPlayer,
    twitterPlayerStream
  };
}

// Check if URL is a video based on domain and file extension
function isVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check for video domains
    if (VIDEO_DOMAINS.some(domainName => domain.includes(domainName))) {
      return true;
    }
    
    // Check for video file extensions
    if (VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Get embed URL for platform videos
function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // YouTube
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      const videoId = domain.includes('youtu.be') 
        ? urlObj.pathname.slice(1) 
        : urlObj.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    
    // Vimeo
    if (domain.includes('vimeo.com')) {
      const videoId = urlObj.pathname.slice(1);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    
    // Dailymotion
    if (domain.includes('dailymotion.com')) {
      const videoId = urlObj.pathname.split('/').pop();
      return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : null;
    }
    
    // Twitch
    if (domain.includes('twitch.tv')) {
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 3 && pathParts[1] === 'videos') {
        const videoId = pathParts[2];
        return `https://player.twitch.tv/?video=v${videoId}&parent=${urlObj.hostname}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fetch X (Twitter) embed data
async function fetchXEmbed(url: string): Promise<any> {
  console.log('🔍 Starting X embed fetch for URL:', url);
  
  try {
    // Check cache first
    const cached = xEmbedCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < PLATFORM_CACHE_DURATION) {
      console.log('📦 Returning cached X embed data for:', url);
      return cached.data;
    }

    console.log('🌐 Fetching fresh X embed data for:', url);

    // X oEmbed API - use the current endpoint
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&hide_thread=true&dnt=true`;
    console.log('🔗 X oEmbed URL:', oembedUrl);
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    console.log('📡 X API response status:', response.status);
    console.log('📡 X API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ X API error response:', errorText);
      throw new Error(`X API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ X embed data received:', JSON.stringify(data, null, 2));
    
    // Cache the result
    xEmbedCache.set(url, {
      data,
      timestamp: Date.now()
    });
    console.log('💾 Cached X embed data for:', url);

    return data;
  } catch (error) {
    console.error('❌ X embed fetch error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: url
    });
    return null;
  }
}

// Fetch Telegram post data (for public channels)
async function fetchTelegramPost(url: string): Promise<any> {
  try {
    // Check cache first
    const cached = telegramCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < PLATFORM_CACHE_DURATION) {
      return cached.data;
    }

    // Extract channel and message ID from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    if (pathParts.length < 3) {
      throw new Error('Invalid Telegram URL format');
    }

    const channel = pathParts[1];
    const messageId = pathParts[2];

    // For now, we'll just fetch the page and extract metadata
    // In the future, you could integrate with Telegram Bot API if you have a bot
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Telegram fetch error: ${response.status}`);
    }

    const html = await response.text();
    const metaData = extractMetaTags(html);

    const data = {
      ...metaData,
      channel,
      messageId,
      platform: 'telegram'
    };

    // Cache the result
    telegramCache.set(url, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    console.error('Telegram fetch error:', error);
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('i.ytimg.com') || // YouTube images
         lowerUrl.includes('img.youtube.com'); // YouTube images
}

export async function POST(request: NextRequest) {
  try {
    const { url, postId } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check for blocked domains
    if (isBlockedDomain(url)) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    // Handle image URLs - return early with minimal data
    if (isImageUrl(url)) {
      console.log('Skipping image URL:', url);
      return NextResponse.json({
        url: url,
        title: '',
        description: '',
        imageUrl: null,
        domain: urlObj.hostname,
        faviconUrl: null,
        cachedAt: new Date().toISOString(),
        isImage: true,
        isVideo: false
      });
    }

    // Check cache first
    const cached = linkPreviewCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached preview for:', url);
      return NextResponse.json(cached.data);
    }

    console.log('Fetching link preview for:', url);

    // Platform-specific handling
    const domain = urlObj.hostname.toLowerCase();
    let platformData = null;

    // X (Twitter) handling
    if (domain.includes('x.com') || domain.includes('twitter.com')) {
      console.log('🐦 Detected X/Twitter URL:', url);
      console.log('🐦 Domain:', domain);
      
      platformData = await fetchXEmbed(url);
      console.log('🐦 X embed fetch result:', platformData ? 'SUCCESS' : 'FAILED');
      
      if (platformData) {
        console.log('🐦 Processing X platform data:', JSON.stringify(platformData, null, 2));
        
        const isVideo = platformData.type === 'video' || Boolean(platformData.html?.includes('video'));
        console.log('🐦 X video detection:', { type: platformData.type, hasVideoInHtml: Boolean(platformData.html?.includes('video')), isVideo });
        
        const previewData = {
          url: url,
          title: platformData.author_name ? `${platformData.author_name}: ${platformData.title || ''}` : platformData.title || '',
          description: platformData.description || '',
          imageUrl: platformData.image || null,
          domain: urlObj.hostname,
          faviconUrl: null,
          cachedAt: new Date().toISOString(),
          isVideo: isVideo,
          embedUrl: platformData.html || null,
          platform: 'x'
        };

        console.log('🐦 Final X preview data:', JSON.stringify(previewData, null, 2));

        // Cache the result
        linkPreviewCache.set(url, {
          data: previewData,
          timestamp: Date.now()
        });

        return NextResponse.json(previewData);
      } else {
        console.log('🐦 X embed fetch failed, trying fallback approach');
        
        // Fallback: Fetch the X page directly and extract metadata
        try {
          console.log('🐦 Attempting fallback: fetching X page directly');
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const html = await response.text();
            const metaData = extractMetaTags(html);
            
            console.log('🐦 Fallback metadata extracted:', metaData);
            
            const isVideo = Boolean(metaData.ogVideo || metaData.twitterPlayer);
            
            const previewData = {
              url: url,
              title: metaData.title || '',
              description: metaData.description || '',
              imageUrl: metaData.imageUrl || null,
              domain: urlObj.hostname,
              faviconUrl: metaData.faviconUrl ? new URL(metaData.faviconUrl, url).href : null,
              cachedAt: new Date().toISOString(),
              isVideo: isVideo,
              embedUrl: null, // No embed URL from fallback
              platform: 'x'
            };

            console.log('🐦 Fallback X preview data:', JSON.stringify(previewData, null, 2));

            // Cache the result
            linkPreviewCache.set(url, {
              data: previewData,
              timestamp: Date.now()
            });

            return NextResponse.json(previewData);
          }
        } catch (fallbackError) {
          console.error('🐦 Fallback approach also failed:', fallbackError);
        }
        
        console.log('🐦 All X approaches failed, falling back to generic handling');
      }
    }

    // Telegram handling
    if (domain.includes('t.me')) {
      platformData = await fetchTelegramPost(url);
      if (platformData) {
        const previewData = {
          url: url,
          title: platformData.title || '',
          description: platformData.description || '',
          imageUrl: platformData.imageUrl || null,
          domain: urlObj.hostname,
          faviconUrl: platformData.faviconUrl || null,
          cachedAt: new Date().toISOString(),
          isVideo: Boolean(platformData.ogVideo || platformData.twitterPlayer),
          embedUrl: null, // Telegram doesn't provide embed URLs
          platform: 'telegram'
        };

        // Cache the result
        linkPreviewCache.set(url, {
          data: previewData,
          timestamp: Date.now()
        });

        return NextResponse.json(previewData);
      }
    }

    // Generic URL handling
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 500 });
    }

    const html = await response.text();
    const metaData = extractMetaTags(html);

    console.log('Extracted metadata:', metaData);

    // Enhanced video detection
    const hasVideoMetadata = Boolean(
      metaData.ogVideo || 
      metaData.ogVideoType || 
      metaData.twitterPlayer || 
      metaData.twitterPlayerStream
    );

    const isVideo = isVideoUrl(url) || hasVideoMetadata;
    const embedUrl = getEmbedUrl(url);

    // Build response data
    const previewData = {
      url: url,
      title: metaData.title || '',
      description: metaData.description || '',
      imageUrl: metaData.imageUrl || null,
      domain: urlObj.hostname,
      faviconUrl: metaData.faviconUrl ? new URL(metaData.faviconUrl, url).href : null,
      cachedAt: new Date().toISOString(),
      isVideo,
      embedUrl,
      platform: null
    };

    console.log('Generated preview data:', previewData);

    // Cache the result
    linkPreviewCache.set(url, {
      data: previewData,
      timestamp: Date.now()
    });

    return NextResponse.json(previewData);

  } catch (error) {
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 