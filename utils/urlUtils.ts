// URL regex pattern to match various URL formats
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const urls: string[] = [];
  const matches = text.match(URL_REGEX);
  
  if (matches) {
    // Filter out URLs that are likely not valid
    const validUrls = matches.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
    
    // Remove duplicates
    const uniqueUrls = [...new Set(validUrls)];
    urls.push(...uniqueUrls);
  }
  
  return urls;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 