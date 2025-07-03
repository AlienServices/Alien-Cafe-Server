import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Test different video platforms
    let embedUrl = null;
    let platform = null;
    
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      const videoId = domain.includes('youtu.be') 
        ? urlObj.pathname.slice(1) 
        : urlObj.searchParams.get('v');
      if (videoId) {
        const origin = process.env.NODE_ENV === 'production' 
          ? 'https://alien-cafe-server.onrender.com' 
          : 'http://localhost:3000';
        embedUrl = `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent(origin)}&enablejsapi=1`;
        platform = 'youtube';
      }
    } else if (domain.includes('vimeo.com')) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        const origin = process.env.NODE_ENV === 'production' 
          ? 'https://alien-cafe-server.onrender.com' 
          : 'http://localhost:3000';
        embedUrl = `https://player.vimeo.com/video/${videoId}?origin=${encodeURIComponent(origin)}`;
        platform = 'vimeo';
      }
    } else if (domain.includes('dailymotion.com')) {
      const videoId = urlObj.pathname.split('/').pop();
      if (videoId) {
        const origin = process.env.NODE_ENV === 'production' 
          ? 'https://alien-cafe-server.onrender.com' 
          : 'http://localhost:3000';
        embedUrl = `https://www.dailymotion.com/embed/video/${videoId}?origin=${encodeURIComponent(origin)}`;
        platform = 'dailymotion';
      }
    }

    return NextResponse.json({
      originalUrl: url,
      domain,
      platform,
      embedUrl,
      testIframe: embedUrl ? `
        <iframe 
          src="${embedUrl}" 
          width="560" 
          height="315" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      ` : null,
      headers: {
        'Content-Security-Policy': "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.dailymotion.com",
        'X-Frame-Options': 'SAMEORIGIN'
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid URL', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 400 });
  }
} 