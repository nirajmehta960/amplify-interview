interface LocalVideoMetadata {
  sessionId: string;
  timestamp: number;
  duration: number;
  size: number;
  format: string;
  transcription?: {
    text: string;
    confidence: number;
    duration: number;
  };
  aiFeedback?: {
    overallScore: number;
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
  };
}

interface StoredVideoData {
  metadata: LocalVideoMetadata;
  videoBlob: ArrayBuffer;
  audioBlob?: ArrayBuffer;
}

class LocalVideoStorageService {
  private dbName = "AmplifyInterviewDB";
  private dbVersion = 2;
  private storeName = "interviewVideos";
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error("IndexedDB open error:", request.error);
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Delete existing object store if it exists (for clean upgrade)
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName);
        }

        // Create object store with correct keyPath
        const store = db.createObjectStore(this.storeName, {
          keyPath: "metadata.sessionId",
          autoIncrement: false,
        });

        // Create indexes for efficient queries
        store.createIndex("timestamp", "metadata.timestamp", { unique: false });
        store.createIndex("duration", "metadata.duration", { unique: false });
        store.createIndex("size", "metadata.size", { unique: false });
      };

      request.onblocked = () => {
        console.warn("IndexedDB upgrade blocked, database is in use");
      };
    });
  }

  /**
   * Store video locally with metadata
   */
  async storeVideo(
    sessionId: string,
    videoBlob: Blob,
    audioBlob?: Blob,
    metadata?: Partial<LocalVideoMetadata>
  ): Promise<LocalVideoMetadata> {
    if (!this.db) {
      await this.initialize();
    }

    const videoMetadata: LocalVideoMetadata = {
      sessionId,
      timestamp: Date.now(),
      duration: 0, // Will be calculated from video
      size: videoBlob.size,
      format: videoBlob.type,
      ...metadata,
    };

    // Convert Blobs to ArrayBuffers for IndexedDB storage
    const videoArrayBuffer = await videoBlob.arrayBuffer();
    const audioArrayBuffer = audioBlob
      ? await audioBlob.arrayBuffer()
      : undefined;

    const storedData: StoredVideoData = {
      metadata: videoMetadata,
      videoBlob: videoArrayBuffer,
      audioBlob: audioArrayBuffer,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.put(storedData);

      request.onsuccess = () => {
        resolve(videoMetadata);
      };

      request.onerror = (event) => {
        console.error("Failed to store video:", event);
        console.error("Stored data structure:", storedData);
        reject(new Error(`Failed to store video locally: ${event}`));
      };
    });
  }

  /**
   * Retrieve video data by session ID
   */
  async getVideo(sessionId: string): Promise<StoredVideoData | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      const request = store.get(sessionId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve video"));
      };
    });
  }

  /**
   * Get all stored videos metadata
   */
  async getAllVideos(): Promise<LocalVideoMetadata[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      const request = store.getAll();

      request.onsuccess = () => {
        const videos = request.result.map(
          (data: StoredVideoData) => data.metadata
        );
        resolve(videos);
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve videos"));
      };
    });
  }

  /**
   * Delete video by session ID
   */
  async deleteVideo(sessionId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.delete(sessionId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to delete video"));
      };
    });
  }

  /**
   * Update video metadata (e.g., add transcription, AI feedback)
   */
  async updateVideoMetadata(
    sessionId: string,
    updates: Partial<LocalVideoMetadata>
  ): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    // First get the existing data
    const existingData = await this.getVideo(sessionId);
    if (!existingData) {
      throw new Error("Video not found");
    }

    // Update metadata
    const updatedData: StoredVideoData = {
      ...existingData,
      metadata: {
        ...existingData.metadata,
        ...updates,
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.put(updatedData);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to update video metadata"));
      };
    });
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalVideos: number;
    totalSize: number;
    averageSize: number;
    oldestVideo: Date | null;
    newestVideo: Date | null;
  }> {
    const videos = await this.getAllVideos();

    if (videos.length === 0) {
      return {
        totalVideos: 0,
        totalSize: 0,
        averageSize: 0,
        oldestVideo: null,
        newestVideo: null,
      };
    }

    const totalSize = videos.reduce((sum, video) => sum + video.size, 0);
    const timestamps = videos.map((video) => video.timestamp);

    return {
      totalVideos: videos.length,
      totalSize,
      averageSize: totalSize / videos.length,
      oldestVideo: new Date(Math.min(...timestamps)),
      newestVideo: new Date(Math.max(...timestamps)),
    };
  }

  /**
   * Clear all stored videos (for cleanup)
   */
  async clearAllVideos(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to clear videos"));
      };
    });
  }

  /**
   * Export video data for backup
   */
  async exportVideoData(sessionId: string): Promise<{
    metadata: LocalVideoMetadata;
    videoUrl: string;
    audioUrl?: string;
  }> {
    const videoData = await this.getVideo(sessionId);
    if (!videoData) {
      throw new Error("Video not found");
    }

    // Convert ArrayBuffer back to Blob
    const videoBlob = new Blob([videoData.videoBlob], {
      type: videoData.metadata.format,
    });
    const audioBlob = videoData.audioBlob
      ? new Blob([videoData.audioBlob], { type: "audio/webm" })
      : undefined;

    const videoUrl = URL.createObjectURL(videoBlob);
    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;

    return {
      metadata: videoData.metadata,
      videoUrl,
      audioUrl,
    };
  }

  /**
   * Extract audio from video blob for processing
   */
  async extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      video.onloadedmetadata = async () => {
        try {
          const stream = video.captureStream();
          const audioTracks = stream.getAudioTracks();

          if (audioTracks.length === 0) {
            throw new Error("No audio track found in video");
          }

          const mediaStream = new MediaStream(audioTracks);
          const mediaRecorder = new MediaRecorder(mediaStream);
          const chunks: BlobPart[] = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(chunks, { type: "audio/webm" });
            resolve(audioBlob);
          };

          mediaRecorder.start();

          // Record for the duration of the video
          setTimeout(() => {
            mediaRecorder.stop();
          }, video.duration * 1000);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error("Failed to load video for audio extraction"));
      };

      video.src = URL.createObjectURL(videoBlob);
    });
  }

  /**
   * Get video blob from stored data for processing
   */
  async getVideoBlob(sessionId: string): Promise<Blob | null> {
    const videoData = await this.getVideo(sessionId);
    if (!videoData) {
      return null;
    }

    // Convert ArrayBuffer back to Blob
    return new Blob([videoData.videoBlob], { type: videoData.metadata.format });
  }

  /**
   * Force database reset (useful for troubleshooting)
   */
  async resetDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);

      deleteRequest.onsuccess = () => {
        this.db = null;
        resolve();
      };

      deleteRequest.onerror = () => {
        console.error("Failed to delete database:", deleteRequest.error);
        reject(new Error("Failed to reset database"));
      };

      deleteRequest.onblocked = () => {
        console.warn("Database deletion blocked, close other tabs");
      };
    });
  }
}

export const localVideoStorageService = new LocalVideoStorageService();
export default localVideoStorageService;
