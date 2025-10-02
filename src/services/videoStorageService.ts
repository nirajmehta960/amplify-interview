import { supabase } from "@/integrations/supabase/client";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface VideoUploadResult {
  url: string;
  path: string;
  size: number;
}

class VideoStorageService {
  private bucketName = "interview-videos";

  /**
   * Upload video file to Supabase Storage
   */
  async uploadVideo(
    videoBlob: Blob,
    sessionId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<VideoUploadResult> {
    try {
      // Ensure bucket exists
      await this.ensureBucketExists();

      console.log("Original video size:", videoBlob.size, "bytes");

      // Determine file extension based on MIME type
      let extension = "webm";
      let mimeType = "video/webm";

      if (videoBlob.type.includes("mp4")) {
        extension = "mp4";
        mimeType = "video/mp4";
      }

      const fileName = `${sessionId}/interview-recording-${Date.now()}.${extension}`;

      // Convert blob to file
      const file = new File([videoBlob], `interview-recording.${extension}`, {
        type: mimeType,
      });

      console.log("Uploading file:", file.name, "Size:", file.size, "bytes");

      // Check if file is too large and compress if needed
      let finalFile = file;
      const maxFileSize = 500 * 1024 * 1024; // 500MB limit for 1-hour recordings

      if (file.size > maxFileSize) {
        console.log("File too large, attempting compression...");
        try {
          const compressedBlob = await this.compressVideo(videoBlob);
          finalFile = new File([compressedBlob], file.name, { type: mimeType });
          console.log("Compressed file size:", finalFile.size, "bytes");
        } catch (compressionError) {
          console.warn(
            "Compression failed, uploading original file:",
            compressionError
          );
        }
      }

      // Use Supabase storage upload directly
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, finalFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw error;
      }

      console.log("Upload successful:", data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        path: fileName,
        size: finalFile.size,
      };
    } catch (error) {
      console.error("Video upload error:", error);
      throw new Error("Failed to upload video");
    }
  }

  /**
   * Upload audio file for transcription
   */
  async uploadAudio(audioBlob: Blob, sessionId: string): Promise<string> {
    try {
      await this.ensureBucketExists();

      const fileName = `${sessionId}/audio-${Date.now()}.webm`;

      const file = new File([audioBlob], "audio.webm", {
        type: "audio/webm",
      });

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Audio upload error:", error);
      throw new Error("Failed to upload audio");
    }
  }

  /**
   * Delete video files for a session
   */
  async deleteSessionVideos(sessionId: string): Promise<void> {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(this.bucketName)
        .list(sessionId);

      if (listError) {
        throw listError;
      }

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${sessionId}/${file.name}`);

        const { error: deleteError } = await supabase.storage
          .from(this.bucketName)
          .remove(filePaths);

        if (deleteError) {
          throw deleteError;
        }
      }
    } catch (error) {
      console.error("Delete videos error:", error);
      throw new Error("Failed to delete session videos");
    }
  }

  /**
   * Get video URL for playback
   */
  async getVideoUrl(sessionId: string, videoPath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .getPublicUrl(videoPath);

      if (error) {
        throw error;
      }

      return data.publicUrl;
    } catch (error) {
      console.error("Get video URL error:", error);
      throw new Error("Failed to get video URL");
    }
  }

  /**
   * Ensure storage bucket exists
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        console.warn("Could not list buckets, continuing anyway:", error);
        return; // Don't fail if we can't check buckets
      }

      const bucketExists = buckets?.some(
        (bucket) => bucket.name === this.bucketName
      );

      if (!bucketExists) {
        console.log("Creating new bucket:", this.bucketName);

        // Create bucket with more lenient settings
        const { error: createError } = await supabase.storage.createBucket(
          this.bucketName,
          {
            public: true,
            allowedMimeTypes: [
              "video/webm",
              "video/mp4",
              "video/quicktime",
              "audio/webm",
              "audio/mp3",
              "audio/wav",
            ],
            fileSizeLimit: 500 * 1024 * 1024, // 500MB limit (more conservative)
          }
        );

        if (createError) {
          console.warn(
            "Could not create bucket, continuing anyway:",
            createError
          );
          // Don't throw error, let the upload attempt proceed
        } else {
          console.log("Bucket created successfully");
        }
      } else {
        console.log("Bucket already exists:", this.bucketName);
      }
    } catch (error) {
      console.warn("Bucket setup warning (non-fatal):", error);
      // Don't throw error, let the upload attempt proceed
    }
  }

  /**
   * Get storage usage for a user
   */
  async getStorageUsage(userId: string): Promise<{
    totalSize: number;
    fileCount: number;
    sessions: string[];
  }> {
    try {
      // Get all files for the user
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list(userId);

      if (error) {
        throw error;
      }

      let totalSize = 0;
      const sessions = new Set<string>();

      if (files) {
        files.forEach((file) => {
          totalSize += file.metadata?.size || 0;
          sessions.add(file.name.split("/")[0]);
        });
      }

      return {
        totalSize,
        fileCount: files?.length || 0,
        sessions: Array.from(sessions),
      };
    } catch (error) {
      console.error("Storage usage error:", error);
      return {
        totalSize: 0,
        fileCount: 0,
        sessions: [],
      };
    }
  }

  /**
   * Compress video before upload (client-side)
   */
  async compressVideo(videoBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.onloadedmetadata = () => {
        // Set canvas dimensions
        const maxWidth = 1280;
        const maxHeight = 720;

        let { videoWidth, videoHeight } = video;

        if (videoWidth > maxWidth || videoHeight > maxHeight) {
          const ratio = Math.min(
            maxWidth / videoWidth,
            maxHeight / videoHeight
          );
          videoWidth *= ratio;
          videoHeight *= ratio;
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Draw video frame
        ctx?.drawImage(video, 0, 0, videoWidth, videoHeight);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress video"));
            }
          },
          "video/webm",
          0.8 // Quality setting
        );
      };

      video.onerror = () => {
        reject(new Error("Failed to load video for compression"));
      };

      video.src = URL.createObjectURL(videoBlob);
    });
  }
}

export const videoStorageService = new VideoStorageService();
export default videoStorageService;
