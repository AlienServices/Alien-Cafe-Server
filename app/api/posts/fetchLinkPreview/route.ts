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

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// X (Twitter) API configuration
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const X_API_BASE_URL = 'https://api.twitter.com/2';

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
  // More flexible regex patterns that handle different attribute orders and quote styles
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  console.log('title', title);

  // More flexible og:title pattern
  const ogTitleMatch = html.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["'][^>]*>/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';
  console.log('ogTitle', ogTitle);
  console.log('ogTitleMatch', ogTitleMatch);
  
  // Debug: Let's also try a more permissive pattern
  const debugOgTitleMatch = html.match(/og:title[^>]*content=["']([^"']+)["']/i);
  console.log('debugOgTitleMatch', debugOgTitleMatch);
  // More flexible og:description pattern
  const ogDescMatch = html.match(/<meta[^>]*(?:property|name)=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:description["'][^>]*>/i);
  const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : '';
  console.log('ogDesc', ogDesc);
  // More flexible og:image pattern
  const ogImageMatch = html.match(/<meta[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';
  console.log('ogImage', ogImage);
  // X/Twitter specific OG tags
  const ogSiteNameMatch = html.match(/<meta[^>]*(?:property|name)=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:site_name["'][^>]*>/i);
  console.log('ogSiteNameMatch', ogSiteNameMatch);
  const ogSiteName = ogSiteNameMatch ? ogSiteNameMatch[1].trim() : '';
  console.log('ogSiteName', ogSiteName);
  const ogUrlMatch = html.match(/<meta[^>]*(?:property|name)=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:url["'][^>]*>/i);
  const ogUrl = ogUrlMatch ? ogUrlMatch[1].trim() : '';
  console.log('ogUrl', ogUrl);
  const ogTypeMatch = html.match(/<meta[^>]*(?:property|name)=["']og:type["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:type["'][^>]*>/i);
  const ogType = ogTypeMatch ? ogTypeMatch[1].trim() : '';
  console.log('ogType', ogType);
  // More flexible description pattern
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                   html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
  const description = descMatch ? descMatch[1].trim() : '';
  console.log('description', description);
  // More flexible favicon pattern
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/i);
  const favicon = faviconMatch ? faviconMatch[1].trim() : '';
  console.log('favicon', favicon);
  // Video-specific metadata with flexible patterns
  const ogVideoMatch = html.match(/<meta[^>]*(?:property|name)=["']og:video["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:video["'][^>]*>/i);
  const ogVideo = ogVideoMatch ? ogVideoMatch[1].trim() : '';
  console.log('ogVideo', ogVideo);
  const ogVideoTypeMatch = html.match(/<meta[^>]*(?:property|name)=["']og:video:type["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:video:type["'][^>]*>/i);
  const ogVideoType = ogVideoTypeMatch ? ogVideoTypeMatch[1].trim() : '';
  console.log('ogVideoType', ogVideoType);
  const twitterPlayerMatch = html.match(/<meta[^>]*(?:property|name)=["']twitter:player["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']twitter:player["'][^>]*>/i);
  const twitterPlayer = twitterPlayerMatch ? twitterPlayerMatch[1].trim() : '';
  console.log('twitterPlayer', twitterPlayer);    
  const twitterPlayerStreamMatch = html.match(/<meta[^>]*(?:property|name)=["']twitter:player:stream["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']twitter:player:stream["'][^>]*>/i);
  const twitterPlayerStream = twitterPlayerStreamMatch ? twitterPlayerStreamMatch[1].trim() : '';
  console.log('twitterPlayerStream', twitterPlayerStream);
  
  // Debug: Check for any Open Graph tags
  const allOgMatches = html.match(/og:[^"']+/gi);
  console.log('🔍 All OG tags found:', allOgMatches);
  
  // Debug: Check for any Twitter tags
  const allTwitterMatches = html.match(/twitter:[^"']+/gi);
  console.log('🔍 All Twitter tags found:', allTwitterMatches);
  
  // Fallback: Try more permissive patterns if the strict ones didn't work
  let fallbackTitle = ogTitle || title;
  let fallbackDescription = ogDesc || description;
  let fallbackImageUrl = ogImage;
  
  if (!fallbackTitle) {
    const permissiveTitleMatch = html.match(/og:title[^>]*content=["']([^"']+)["']/i);
    fallbackTitle = permissiveTitleMatch ? permissiveTitleMatch[1].trim() : title;
  }
  
  if (!fallbackDescription) {
    const permissiveDescMatch = html.match(/og:description[^>]*content=["']([^"']+)["']/i);
    fallbackDescription = permissiveDescMatch ? permissiveDescMatch[1].trim() : description;
  }
  
  if (!fallbackImageUrl) {
    const permissiveImageMatch = html.match(/og:image[^>]*content=["']([^"']+)["']/i);
    fallbackImageUrl = permissiveImageMatch ? permissiveImageMatch[1].trim() : '';
  }
  
  console.log('🔧 Fallback values:', {
    fallbackTitle,
    fallbackDescription,
    fallbackImageUrl
  });
  
  return {
    title: fallbackTitle,
    description: fallbackDescription,
    imageUrl: fallbackImageUrl,
    faviconUrl: favicon,
    ogVideo,
    ogVideoType,
    twitterPlayer,
    twitterPlayerStream,
    // Additional OG fields
    ogSiteName,
    ogUrl,
    ogType
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

// Extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Handle youtu.be URLs
    if (domain.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
    
    // Handle youtube.com URLs
    if (domain.includes('youtube.com')) {
      // Standard watch URLs
      if (urlObj.pathname.includes('/watch')) {
        return urlObj.searchParams.get('v');
      }
      
      // Short URLs
      if (urlObj.pathname.includes('/y/')) {
        return urlObj.searchParams.get('v');
      }
      
      // Embed URLs
      if (urlObj.pathname.includes('/embed/')) {
        return urlObj.pathname.split('/embed/')[1];
      }
      
      // Channel video URLs
      if (urlObj.pathname.includes('/channel/') && urlObj.searchParams.get('v')) {
        return urlObj.searchParams.get('v');
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fetch YouTube video data using the official API
async function fetchYouTubeVideoData(videoId: string): Promise<any> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured, falling back to scraping');
    return null;
  }

  try {
    console.log('🎥 Fetching YouTube video data for ID:', videoId);
    
    const apiUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ YouTube API error:', response.status, errorText);
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn('❌ No video found for ID:', videoId);
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    
    console.log('✅ YouTube API data received:', {
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      duration: video.contentDetails?.duration,
      viewCount: video.statistics?.viewCount
    });

    return {
      id: videoId,
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      thumbnails: snippet.thumbnails,
      duration: video.contentDetails?.duration,
      viewCount: video.statistics?.viewCount,
      likeCount: video.statistics?.likeCount,
      commentCount: video.statistics?.commentCount
    };
  } catch (error) {
    console.error('❌ YouTube API fetch error:', error);
    return null;
  }
}

// Get embed URL for platform videos
function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // YouTube - use API data when available, fallback to URL parsing
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      const videoId = extractYouTubeVideoId(url);
      
      if (videoId) {
        console.log('YouTube video ID extracted:', videoId);
        const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
        // Use dynamic origin based on environment
        const origin = process.env.NODE_ENV === 'production' 
          ? 'https://alien-cafe-server.onrender.com' 
          : 'http://localhost:3000';
        embedUrl.searchParams.set('origin', origin);
        embedUrl.searchParams.set('enablejsapi', '1');
        embedUrl.searchParams.set('rel', '0'); // Don't show related videos
        embedUrl.searchParams.set('modestbranding', '1'); // Minimal YouTube branding
        
        const finalUrl = embedUrl.toString();
        console.log('Generated YouTube embed URL:', finalUrl);
        return finalUrl;
      }
      console.warn('Could not extract YouTube video ID from URL:', url);
      return null;
    }
    
    // Vimeo - add origin parameter
    if (domain.includes('vimeo.com')) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        const embedUrl = new URL(`https://player.vimeo.com/video/${videoId}`);
        // Use dynamic origin based on environment
        const origin = process.env.NODE_ENV === 'production' 
          ? 'https://alien-cafe-server.onrender.com' 
          : 'http://localhost:3000';
        embedUrl.searchParams.set('origin', origin);
        return embedUrl.toString();
      }
      return null;
    }
    
    // Dailymotion - add origin parameter
    if (domain.includes('dailymotion.com')) {
      const videoId = urlObj.pathname.split('/').pop();
      if (videoId) {
        const embedUrl = new URL(`https://www.dailymotion.com/embed/video/${videoId}`);
        // Use dynamic origin based on environment
        const origin = process.env.NODE_ENV === 'production' 
          ? 'https://alien-cafe-server.onrender.com' 
          : 'http://localhost:3000';
        embedUrl.searchParams.set('origin', origin);
        return embedUrl.toString();
      }
      return null;
    }
    
    // Twitch - use proper parent parameter for production
    if (domain.includes('twitch.tv')) {
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 3 && pathParts[1] === 'videos') {
        const videoId = pathParts[2];
        const embedUrl = new URL('https://player.twitch.tv/');
        embedUrl.searchParams.set('video', `v${videoId}`);
        // Use dynamic parent based on environment
        const parent = process.env.NODE_ENV === 'production' 
          ? 'alien-cafe-server.onrender.com' 
          : 'localhost';
        embedUrl.searchParams.set('parent', parent);
        return embedUrl.toString();
      }
    }
    
    // X (Twitter) - use oEmbed widget
    if (domain.includes('x.com') || domain.includes('twitter.com')) {
      const tweetId = extractTweetId(url);
      
      if (tweetId) {
        console.log('X tweet ID extracted:', tweetId);
        // Use X's oEmbed widget for video playback
        const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
        console.log('Generated X embed URL:', embedUrl);
        return embedUrl;
      }
      console.warn('Could not extract X tweet ID from URL:', url);
      return null;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Extract tweet ID from X/Twitter URL
function extractTweetId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Handle URLs like: /username/status/123456789
    if (pathParts.length >= 4 && pathParts[2] === 'status') {
      return pathParts[3];
    }
    
    // Handle URLs like: /i/status/123456789
    if (pathParts.length >= 4 && pathParts[1] === 'i' && pathParts[2] === 'status') {
      return pathParts[3];
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fetch tweet data using X API v2
async function fetchTweetData(tweetId: string): Promise<any> {
  if (!X_BEARER_TOKEN) {
    console.warn('X Bearer Token not configured, skipping API call');
    return null;
  }

  try {
    console.log('🐦 Fetching tweet data for ID:', tweetId);
    
    const apiUrl = `${X_API_BASE_URL}/tweets/${tweetId}?expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type,width,height&user.fields=username,name,profile_image_url&tweet.fields=created_at,text,entities`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ X API error:', response.status, errorText);
      throw new Error(`X API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      console.warn('❌ No tweet found for ID:', tweetId);
      return null;
    }
    console.log('🐦 X API data:', data);
    const tweet = data.data;
    const user = data.includes?.users?.[0];
    const media = data.includes?.media || [];
    
    console.log('✅ X API data received:', {
      text: tweet.text?.substring(0, 100) + '...',
      author: user?.username,
      mediaCount: media.length
    });

    return {
      id: tweetId,
      text: tweet.text,
      created_at: tweet.created_at,
      author: user,
      media: media
    };
  } catch (error) {
    console.error('❌ X API fetch error:', error);
    return null;
  }
}

// Extract X-specific Open Graph data
function extractXOpenGraphData(html: string, url: string) {
  // Extract username from URL as fallback
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const username = pathParts[1];
  
  // Look for X-specific patterns in the HTML
  const tweetTextMatch = html.match(/<meta[^>]*(?:name|property)=["']twitter:text["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:text["'][^>]*>/i);
  
  const tweetText = tweetTextMatch ? tweetTextMatch[1].trim() : '';
  
  // Extract author from various sources
  const authorMatch = html.match(/<meta[^>]*(?:name|property)=["']twitter:creator["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:creator["'][^>]*>/i);
  
  const author = authorMatch ? authorMatch[1].trim() : username;
  
  return {
    username,
    tweetText,
    author,
    isXContent: html.includes('twitter.com') || html.includes('x.com') || html.includes('og:site_name')
  };
}

// Fetch X (Twitter) embed data - NEW APPROACH
async function fetchXEmbed(url: string): Promise<any> {
  console.log('🔍 Starting X link preview fetch for URL:', url);
  
  try {
    // Check cache first
    const cached = xEmbedCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < PLATFORM_CACHE_DURATION) {
      console.log('📦 Returning cached X preview data for:', url);
      return cached.data;
    }

    console.log('🌐 Fetching fresh X preview data for:', url);

    // Strategy 1: Try X API v2 first (most reliable, includes images)
    try {
      console.log('🔄 Strategy 1: Trying X API v2');
      const tweetId = extractTweetId(url);
      
      if (tweetId) {
        const tweetData = await fetchTweetData(tweetId);
        
        if (tweetData) {
          console.log('✅ X API v2 success:', JSON.stringify(tweetData, null, 2));
          
          // Get the best image from media attachments
          let imageUrl = null;
          if (tweetData.media && tweetData.media.length > 0) {
            const media = tweetData.media[0];
            // Prefer preview_image_url for photos, url for videos
            imageUrl = media.preview_image_url || media.url;
          }
          
          const apiResult = {
            url: url,
            title: tweetData.author?.name ? `${tweetData.author.name}: ${tweetData.text?.substring(0, 100)}...` : tweetData.text?.substring(0, 100) + '...',
            description: tweetData.text || '',
            imageUrl: imageUrl,
            domain: new URL(url).hostname,
            faviconUrl: tweetData.author?.profile_image_url || null,
            isVideo: tweetData.media?.some((m: any) => m.type === 'video') || false,
            author: tweetData.author?.username || '',
            site: tweetData.author?.name || '',
            platform: 'x',
            // Additional API data
            tweetId: tweetId,
            createdAt: tweetData.created_at,
            mediaCount: tweetData.media?.length || 0
          };
          
          console.log('✅ Using X API v2 data:', JSON.stringify(apiResult, null, 2));
          
          // Cache the result
          xEmbedCache.set(url, {
            data: apiResult,
            timestamp: Date.now()
          });
          
          return apiResult;
        }
      }
    } catch (apiError) {
      console.log('⚠️ X API v2 failed:', apiError);
    }

    // Strategy 2: Try X's oEmbed API (fallback)
    try {
      console.log('🔄 Strategy 2: Trying X oEmbed API');
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&hide_thread=true`;
      
      const oembedResponse = await fetch(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        console.log('✅ X oEmbed API success:', JSON.stringify(oembedData, null, 2));
        
        // Extract username from URL as fallback
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const username = pathParts[1];
        
        const oembedResult = {
          url: url,
          title: oembedData.author_name ? `${oembedData.author_name}: ${oembedData.title || ''}` : oembedData.title || '',
          description: oembedData.html ? oembedData.html.replace(/<[^>]*>/g, '').trim() : '',
          imageUrl: null, // oEmbed doesn't provide images
          domain: urlObj.hostname,
          faviconUrl: null,
          isVideo: false,
          author: oembedData.author_name || username,
          site: oembedData.author_url || username,
          platform: 'x'
        };
        
        console.log('✅ Using X oEmbed data:', JSON.stringify(oembedResult, null, 2));
        
        // Cache the result
        xEmbedCache.set(url, {
          data: oembedResult,
          timestamp: Date.now()
        });
        
        return oembedResult;
      }
    } catch (oembedError) {
      console.log('⚠️ X oEmbed API failed:', oembedError);
    }

    // Strategy 3: Try direct HTML scraping with different User-Agent
    try {
      console.log('🔄 Strategy 3: Trying direct HTML scraping');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const html = await response.text();
        console.log('📄 HTML response length:', html.length);
        
        // Simple extraction using basic patterns
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        // Look for any meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        const description = descMatch ? descMatch[1].trim() : '';
        
        // Extract username from URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const username = pathParts[1];
        
        const scrapeResult = {
          url: url,
          title: title || `Tweet by @${username}`,
          description: description || 'View this tweet on X',
          imageUrl: null,
          domain: urlObj.hostname,
          faviconUrl: null,
          isVideo: false,
          author: username,
          site: username,
          platform: 'x'
        };
        
        console.log('✅ Using scraped data:', JSON.stringify(scrapeResult, null, 2));
        
        // Cache the result
        xEmbedCache.set(url, {
          data: scrapeResult,
          timestamp: Date.now()
        });
        
        return scrapeResult;
      }
    } catch (scrapeError) {
      console.log('⚠️ Direct scraping failed:', scrapeError);
    }

    // Strategy 4: URL-based fallback
    console.log('🔄 Strategy 4: Using URL-based fallback');
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const username = pathParts[1];
    
    const fallbackData = {
      url: url,
      title: `Tweet by @${username}`,
      description: 'View this tweet on X',
      imageUrl: null,
      domain: urlObj.hostname,
      faviconUrl: null,
      isVideo: false,
      author: username,
      site: username,
      platform: 'x'
    };
    
    console.log('✅ Using URL fallback data:', JSON.stringify(fallbackData, null, 2));
    
    // Cache the result
    xEmbedCache.set(url, {
      data: fallbackData,
      timestamp: Date.now()
    });
    
    return fallbackData;

  } catch (error) {
    console.error('❌ All X strategies failed:', error);
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

    // YouTube handling with API
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      console.log('🎥 Detected YouTube URL:', url);
      
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        console.log('🎥 Extracted YouTube video ID:', videoId);
        
        // Try YouTube API first
        const youtubeData = await fetchYouTubeVideoData(videoId);
        
        if (youtubeData) {
          console.log('🎥 Using YouTube API data');
          
          // Get the best thumbnail
          const thumbnail = youtubeData.thumbnails?.maxres || 
                           youtubeData.thumbnails?.high || 
                           youtubeData.thumbnails?.medium || 
                           youtubeData.thumbnails?.default;
          
          const embedUrl = getEmbedUrl(url);
          
          const previewData = {
            url: url,
            title: youtubeData.title || '',
            description: youtubeData.description ? 
              youtubeData.description.substring(0, 200) + (youtubeData.description.length > 200 ? '...' : '') : '',
            imageUrl: thumbnail?.url || null,
            domain: urlObj.hostname,
            faviconUrl: 'https://www.youtube.com/favicon.ico',
            cachedAt: new Date().toISOString(),
            isVideo: true,
            embedUrl: embedUrl,
            platform: 'youtube',
            // Additional YouTube-specific data
            channelTitle: youtubeData.channelTitle,
            publishedAt: youtubeData.publishedAt,
            duration: youtubeData.duration,
            viewCount: youtubeData.viewCount,
            likeCount: youtubeData.likeCount,
            commentCount: youtubeData.commentCount
          };

          console.log('🎥 Final YouTube preview data:', JSON.stringify(previewData, null, 2));

          // Cache the result
          linkPreviewCache.set(url, {
            data: previewData,
            timestamp: Date.now()
          });

          return NextResponse.json(previewData);
        } else {
          console.log('🎥 YouTube API failed, falling back to scraping');
        }
      }
    }

    // X (Twitter) handling
    if (domain.includes('x.com') || domain.includes('twitter.com')) {
      console.log('🐦 Detected X/Twitter URL:', url);
      console.log('🐦 Domain:', domain);
      
      platformData = await fetchXEmbed(url);
      console.log('🐦 X preview fetch result:', platformData ? 'SUCCESS' : 'FAILED');
      
      if (platformData) {
        console.log('🐦 Processing X platform data:', JSON.stringify(platformData, null, 2));
        
        // Build author display name
        const authorDisplay = platformData.author || platformData.site || '';
        const title = authorDisplay ? `${authorDisplay}: ${platformData.title || ''}` : platformData.title || '';
        
        // Enhanced X video detection
        const isXVideoByApi = platformData.isVideo;
        const isXVideoByUrl = isVideoUrl(url);
        const hasXVideoMetadata = Boolean(platformData.media?.some((m: any) => m.type === 'video'));
        
        // Consider it a video if any of these conditions are met
        const isXVideo = isXVideoByApi || isXVideoByUrl || hasXVideoMetadata;
        
        // Generate embed URL for X videos
        const embedUrl = isXVideo ? getEmbedUrl(url) : null;
        
        console.log('🐦 X video detection analysis:', {
          url,
          isXVideoByApi,
          isXVideoByUrl,
          hasXVideoMetadata,
          finalIsXVideo: isXVideo,
          hasEmbedUrl: Boolean(embedUrl),
          mediaCount: platformData.media?.length || 0
        });
        
        const previewData = {
          url: url,
          title: title,
          description: platformData.description || '',
          imageUrl: platformData.imageUrl || null,
          domain: urlObj.hostname,
          faviconUrl: platformData.faviconUrl || null,
          cachedAt: new Date().toISOString(),
          isVideo: isXVideo,
          embedUrl: embedUrl,
          platform: 'x',
          // Additional X-specific data
          author: platformData.author,
          site: platformData.site
        };

        console.log('🐦 Final X preview data:', JSON.stringify(previewData, null, 2));

        // Cache the result
        linkPreviewCache.set(url, {
          data: previewData,
          timestamp: Date.now()
        });

        return NextResponse.json(previewData);
      } else {
        console.log('🐦 X preview fetch failed, falling back to generic handling');
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

    // Improved video detection logic
    const isVideoByUrl = isVideoUrl(url);
    const isVideoByMetadata = hasVideoMetadata;
    const isVideoByDomain = VIDEO_DOMAINS.some(domainName => urlObj.hostname.toLowerCase().includes(domainName));
    
    // Consider it a video if any of these conditions are met
    const isVideo = isVideoByUrl || isVideoByMetadata || isVideoByDomain;
    const embedUrl = getEmbedUrl(url);

    console.log('🎥 Video detection analysis:', {
      url,
      isVideoByUrl,
      isVideoByMetadata,
      isVideoByDomain,
      finalIsVideo: isVideo,
      hasEmbedUrl: Boolean(embedUrl),
      ogVideo: metaData.ogVideo,
      ogVideoType: metaData.ogVideoType,
      twitterPlayer: metaData.twitterPlayer,
      twitterPlayerStream: metaData.twitterPlayerStream
    });

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
    console.log('Environment info:', {
      hostname: request.headers.get('host'),
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      isVideo: previewData.isVideo,
      embedUrl: previewData.embedUrl,
      platform: previewData.platform
    });

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