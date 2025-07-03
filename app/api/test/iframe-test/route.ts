import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId') || 'dQw4w9WgXcQ'; // Default to Rick Roll
  
  const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Iframe Test</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f0f0f0; 
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .iframe-container { 
            position: relative; 
            width: 100%; 
            height: 0; 
            padding-bottom: 56.25%; 
            margin: 20px 0; 
        }
        .iframe-container iframe { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            border: none; 
        }
        .info { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
        .error { 
            background: #ffebee; 
            color: #c62828; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>YouTube Iframe Embed Test</h1>
        
        <div class="info">
            <h3>Test Information:</h3>
            <p><strong>Video ID:</strong> ${videoId}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>

        <h2>Test 1: Basic YouTube Embed</h2>
        <div class="iframe-container">
            <iframe 
                src="https://www.youtube.com/embed/${videoId}" 
                title="YouTube video player" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>

        <h2>Test 2: YouTube Embed with Parameters</h2>
        <div class="iframe-container">
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1" 
                title="YouTube video player with parameters" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>

        <h2>Test 3: YouTube No-Cookie Embed</h2>
        <div class="iframe-container">
            <iframe 
                src="https://www.youtube-nocookie.com/embed/${videoId}" 
                title="YouTube video player (no-cookie)" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>

        <div class="info">
            <h3>Instructions:</h3>
            <ol>
                <li>Check if all three iframes load properly</li>
                <li>Look for any error messages in the browser console</li>
                <li>Test on different browsers and devices</li>
                <li>Check if videos are playable</li>
            </ol>
        </div>

        <script>
            // Add error handling for iframes
            document.querySelectorAll('iframe').forEach((iframe, index) => {
                iframe.onerror = function() {
                    console.error('Iframe ' + (index + 1) + ' failed to load');
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error';
                    errorDiv.innerHTML = '<strong>Error:</strong> Iframe ' + (index + 1) + ' failed to load';
                    iframe.parentNode.appendChild(errorDiv);
                };
                
                iframe.onload = function() {
                    console.log('Iframe ' + (index + 1) + ' loaded successfully');
                };
            });

            // Log environment info
            console.log('Iframe test environment:', {
                userAgent: navigator.userAgent,
                location: window.location.href,
                timestamp: new Date().toISOString()
            });
        </script>
    </div>
</body>
</html>`;

  return new NextResponse(testHtml, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com"
    }
  });
} 