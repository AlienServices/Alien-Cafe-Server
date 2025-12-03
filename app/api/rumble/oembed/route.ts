import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Basic validation to ensure it's a rumble URL
    try {
      const u = new URL(url);
      if (!u.hostname.toLowerCase().includes('rumble.com')) {
        return NextResponse.json({ error: 'Only rumble.com URLs are supported' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
    }

    const oembedEndpoint = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedEndpoint, {
      // Rumble sometimes requires a user agent; set a reasonable one
      headers: {
        'User-Agent': 'AlienCafe/1.0 (+https://alien.cafe)'
      },
      // Avoid caching to reflect latest
      cache: 'no-store'
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    // Pass through the full oEmbed payload
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=1800'
      }
    });
  } catch (err: any) {
    console.error('Rumble oEmbed proxy failed:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


