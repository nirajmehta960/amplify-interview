import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

class VideoConversionService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;

  /**
   * Initialize FFmpeg
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    this.ffmpeg = new FFmpeg();

    // Load FFmpeg from CDN
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    this.isLoaded = true;
  }

  /**
   * Convert WebM video to MP4
   */
  async convertWebMToMP4(webmBlob: Blob): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.initialize();
    }

    if (!this.ffmpeg) {
      throw new Error("Failed to initialize FFmpeg");
    }

    try {
      // Write input file
      await this.ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

      // Convert to MP4
      await this.ffmpeg.exec([
        "-i",
        "input.webm",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);

      // Read output file
      const data = await this.ffmpeg.readFile("output.mp4");

      // Clean up files
      await this.ffmpeg.deleteFile("input.webm");
      await this.ffmpeg.deleteFile("output.mp4");

      return new Blob([data], { type: "video/mp4" });
    } catch (error) {
      console.error("Video conversion failed:", error);
      throw new Error(
        `Video conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get video duration and metadata for better seeking
   */
  async getVideoMetadata(videoBlob: Blob): Promise<{
    duration: number;
    width: number;
    height: number;
    hasAudio: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(videoBlob);

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          hasAudio: true, // Assume audio for interview videos
        };

        URL.revokeObjectURL(url);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video metadata"));
      };

      video.src = url;
    });
  }

  /**
   * Create a seekable video blob with proper metadata
   */
  async createSeekableVideo(originalBlob: Blob): Promise<Blob> {
    try {
      if (!this.ffmpeg || !this.isLoaded) {
        await this.initialize();
      }

      if (!this.ffmpeg) {
        throw new Error("Failed to initialize FFmpeg");
      }

      // Write input file
      await this.ffmpeg.writeFile("input.webm", await fetchFile(originalBlob));

      // Re-encode with proper metadata for seeking
      await this.ffmpeg.exec([
        "-i",
        "input.webm",
        "-c:v",
        "libvpx-vp9",
        "-c:a",
        "libopus",
        "-movflags",
        "+faststart",
        "-f",
        "webm",
        "output.webm",
      ]);

      // Read output file
      const data = await this.ffmpeg.readFile("output.webm");

      // Clean up files
      await this.ffmpeg.deleteFile("input.webm");
      await this.ffmpeg.deleteFile("output.webm");

      return new Blob([data], { type: "video/webm" });
    } catch (error) {
      console.warn("Video re-encoding failed, using original blob:", error);
      // Return original blob if re-encoding fails
      return originalBlob;
    }
  }

  /**
   * Simple video optimization without FFmpeg (fallback)
   */
  async optimizeVideoForSeeking(originalBlob: Blob): Promise<Blob> {
    // For now, just return the original blob
    // In a production environment, you might want to implement
    // a server-side solution for video optimization
    return originalBlob;
  }
}

export const videoConversionService = new VideoConversionService();
