import { NextRequest, NextResponse } from 'next/server';

// Extract YouTube video ID from various URL formats (including Shorts)
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
      // YouTube Shorts URLs: https://www.youtube.com/shorts/{videoId}
      if (urlObj.pathname.includes('/shorts/')) {
        const shortsMatch = urlObj.pathname.match(/\/shorts\/([^\/\?]+)/);
        return shortsMatch ? shortsMatch[1] : null;
      }
      
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

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const videoId = extractYouTubeVideoId(url);
    
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Could not extract video ID',
        url: url,
        parsedUrl: new URL(url).toString()
      }, { status: 400 });
    }

    // Generate embed URL
    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    embedUrl.searchParams.set('rel', '0');
    embedUrl.searchParams.set('modestbranding', '1');
    embedUrl.searchParams.set('enablejsapi', '1');

    return NextResponse.json({
      success: true,
      originalUrl: url,
      videoId: videoId,
      embedUrl: embedUrl.toString(),
      isShorts: url.includes('/shorts/')
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid URL',
      details: error instanceof Error ? error.message : 'Unknown error',
      url: url
    }, { status: 400 });
  }
} 