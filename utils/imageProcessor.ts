import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ImageProcessor {
  private static readonly DEFAULT_OPTIONS: ImageProcessingOptions = {
    width: 400,
    height: 300,
    quality: 80,
    format: 'jpeg'
  };

  private static readonly CACHE_DIR = join(process.cwd(), 'public', 'link-previews');

  /**
   * Process and store an image for link previews
   */
  static async processImage(
    imageUrl: string, 
    postId: string, 
    options: ImageProcessingOptions = {}
  ): Promise<string | null> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options };
      
      console.log(`Processing image: ${imageUrl} for post ${postId}`);
      
      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);
      if (!imageBuffer) {
        console.log(`Failed to download image: ${imageUrl}`);
        return null;
      }

      // Process the image
      const processedBuffer = await this.resizeAndOptimize(imageBuffer, opts);
      if (!processedBuffer) {
        console.log(`Failed to process image: ${imageUrl}`);
        return null;
      }

      // Generate filename and save
      const filename = this.generateFilename(postId, imageUrl, opts.format);
      const filepath = await this.saveImage(processedBuffer, filename);
      
      if (filepath) {
        const publicUrl = `/link-previews/${filename}`;
        console.log(`Image processed successfully: ${publicUrl}`);
        return publicUrl;
      }

      return null;
    } catch (error) {
      console.error('Image processing error:', error);
      return null;
    }
  }

  /**
   * Download image from URL or decode data URL
   */
  private static async downloadImage(url: string): Promise<Uint8Array | null> {
    try {
      // Handle data URLs
      if (url.startsWith('data:')) {
        const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          const base64Data = dataUrlMatch[2];
          const buffer = Buffer.from(base64Data, 'base64');
          return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
        throw new Error('Invalid data URL format');
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AlienCafeBot/1.0; +https://aliencafe.com/bot)',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.log(`Failed to fetch image: ${url}, status: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  /**
   * Resize and optimize image
   */
  private static async resizeAndOptimize(
    buffer: Uint8Array, 
    options: ImageProcessingOptions
  ): Promise<Buffer | null> {
    try {
      let sharpInstance = sharp(buffer);

      // Resize image
      if (options.width || options.height) {
        sharpInstance = sharpInstance.resize(options.width, options.height, {
          fit: 'cover',
          position: 'center'
        });
      }

      // Convert and optimize based on format
      switch (options.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality: options.quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: options.quality });
          break;
        default:
          sharpInstance = sharpInstance.jpeg({ quality: options.quality });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  }

  /**
   * Generate unique filename for processed image
   */
  private static generateFilename(
    postId: string, 
    originalUrl: string, 
    format: string = 'jpeg'
  ): string {
    const urlHash = this.hashString(originalUrl);
    const timestamp = Date.now();
    return `${postId}-${urlHash}-${timestamp}.${format}`;
  }

  /**
   * Save processed image to disk
   */
  private static async saveImage(buffer: Buffer, filename: string): Promise<string | null> {
    try {
      // Ensure cache directory exists
      await mkdir(this.CACHE_DIR, { recursive: true });
      
      const filepath = join(this.CACHE_DIR, filename);
      await writeFile(filepath, new Uint8Array(buffer));
      
      return filepath;
    } catch (error) {
      console.error('Error saving image:', error);
      return null;
    }
  }

  /**
   * Simple hash function for URLs
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate if URL is a valid image
   */
  static isValidImageUrl(url: string): boolean {
    try {
      // Handle data URLs
      if (url.startsWith('data:')) {
        const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          const mimeType = dataUrlMatch[1];
          return mimeType.startsWith('image/');
        }
        return false;
      }

      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      // Check for common image extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      return imageExtensions.some(ext => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  /**
   * Get image dimensions without downloading the full image
   */
  static async getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AlienCafeBot/1.0; +https://aliencafe.com/bot)',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      // Try to get dimensions from headers (some CDNs provide this)
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.startsWith('image/')) {
        // For now, return null - in a full implementation you might
        // download just the image header to get dimensions
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return null;
    }
  }
} 