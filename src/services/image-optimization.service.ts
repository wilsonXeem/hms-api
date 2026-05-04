import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class ImageOptimizationService {
  private static readonly MAX_WIDTH = 800;
  private static readonly MAX_HEIGHT = 600;
  private static readonly QUALITY = 85;
  private static readonly LOGO_MAX_WIDTH = 400;
  private static readonly LOGO_MAX_HEIGHT = 200;

  /**
   * Optimize logo image for web use
   */
  static async optimizeLogo(inputPath: string, outputPath: string): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(this.LOGO_MAX_WIDTH, this.LOGO_MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: this.QUALITY })
        .toFile(outputPath);

      // Remove original file after optimization
      if (fs.existsSync(inputPath) && inputPath !== outputPath) {
        fs.unlinkSync(inputPath);
      }
    } catch (error) {
      throw new Error(`Image optimization failed: ${error}`);
    }
  }

  /**
   * Optimize general images
   */
  static async optimizeImage(inputPath: string, outputPath: string): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: this.QUALITY })
        .toFile(outputPath);

      // Remove original file after optimization
      if (fs.existsSync(inputPath) && inputPath !== outputPath) {
        fs.unlinkSync(inputPath);
      }
    } catch (error) {
      throw new Error(`Image optimization failed: ${error}`);
    }
  }

  /**
   * Validate image file
   */
  static async validateImage(filePath: string): Promise<boolean> {
    try {
      const metadata = await sharp(filePath).metadata();
      
      // Check if it's a valid image
      if (!metadata.width || !metadata.height) {
        return false;
      }

      // Check dimensions (not too small)
      if (metadata.width < 50 || metadata.height < 50) {
        return false;
      }

      // Check file size (not too large - already handled by multer but double check)
      const stats = fs.statSync(filePath);
      if (stats.size > 5 * 1024 * 1024) { // 5MB
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate optimized filename
   */
  static getOptimizedFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    return `${nameWithoutExt}-optimized.jpg`;
  }

  /**
   * Create thumbnail
   */
  static async createThumbnail(inputPath: string, outputPath: string, size: number = 150): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } catch (error) {
      throw new Error(`Thumbnail creation failed: ${error}`);
    }
  }

  /**
   * Get image metadata
   */
  static async getImageInfo(filePath: string): Promise<sharp.Metadata> {
    try {
      return await sharp(filePath).metadata();
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error}`);
    }
  }
}