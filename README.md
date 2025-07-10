# Alien Cafe Server

## YouTube API Setup

To enable enhanced YouTube video link previews with rich metadata, you need to set up a YouTube Data API v3 key:

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing (required for API usage)

### 2. Enable YouTube Data API v3
1. Go to the [API Library](https://console.cloud.google.com/apis/library)
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

### 3. Create API Credentials
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key

### 4. Set Environment Variable
Add the API key to your environment variables:

```bash
# .env.local or your deployment environment
YOUTUBE_API_KEY=your_api_key_here
```

### 5. API Quota
- **Free tier**: 10,000 units per day
- **Cost**: $5 per 1,000 additional units
- **Video lookup**: ~1 unit per request
- **Typical usage**: 100-1,000 requests per day for a small app

### Benefits of Using YouTube API
- ✅ **Reliable**: Official API with guaranteed uptime
- ✅ **Rich data**: Access to title, description, thumbnails, statistics
- ✅ **Compliant**: Follows YouTube's terms of service
- ✅ **Future-proof**: Google maintains and supports the API
- ✅ **Rate limited**: Clear quotas prevent abuse

### Fallback Behavior
If no API key is configured, the system falls back to the existing scraping method, but with reduced reliability and data quality.

## Development

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
