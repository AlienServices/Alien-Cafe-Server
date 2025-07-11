import { NextRequest, NextResponse } from 'next/server';

// Extract Rumble video ID from various URL formats
function extractRumbleVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (domain.includes('rumble.com')) {
      // Handle embed URLs: https://rumble.com/embed/{videoId}/
      if (urlObj.pathname.includes('/embed/')) {
        const embedMatch = urlObj.pathname.match(/\/embed\/([^\/]+)/);
        return embedMatch ? embedMatch[1] : null;
      }
      
      // Handle regular video URLs: https://rumble.com/v{videoId}-title
      const videoMatch = urlObj.pathname.match(/\/v([^-]+)/);
      if (videoMatch) return videoMatch[1];
      
      // Handle alternative Rumble URL formats: https://rumble.com/v{videoId}
      const altMatch = urlObj.pathname.match(/\/v([^\/]+)/);
      return altMatch ? altMatch[1] : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Extract Odysee video ID from various URL formats
function extractOdyseeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (domain.includes('odysee.com')) {
      // Handle embed URLs: https://odysee.com/$/embed/{videoId}
      if (urlObj.pathname.includes('/$/embed/')) {
        const embedMatch = urlObj.pathname.match(/\/\$\/embed\/([^\/]+)/);
        return embedMatch ? embedMatch[1] : null;
      }
      
      // Handle regular video URLs: https://odysee.com/@channel/{videoId}:{hash}
      const videoMatch = urlObj.pathname.match(/@[^\/]+\/([^:]+)/);
      if (videoMatch) return videoMatch[1];
      
      // Handle alternative Odysee URL formats: https://odysee.com/{videoId}:{hash}
      const altMatch = urlObj.pathname.match(/^\/([^:]+)/);
      return altMatch ? altMatch[1] : null;
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
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    let result: any = {
      originalUrl: url,
      domain,
      platform: null,
      videoId: null,
      embedUrl: null,
      testIframe: null
    };
    
    if (domain.includes('rumble.com')) {
      result.platform = 'rumble';
      result.embedUrl = url; // Use original URL directly
      result.testIframe = `
        <iframe 
          src="${result.embedUrl}" 
          width="560" 
          height="315" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    } else if (domain.includes('odysee.com')) {
      result.platform = 'odysee';
      result.embedUrl = url; // Use original URL directly
      result.testIframe = `
        <iframe 
          src="${result.embedUrl}" 
          width="560" 
          height="315" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    }

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid URL', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 400 });
  }
} 