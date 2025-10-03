import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Download, Eye, HardDrive, Database } from "lucide-react";
import { localVideoStorageService } from "@/services/localVideoStorageService";
import { useToast } from "@/hooks/use-toast";

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

interface StorageStats {
  totalVideos: number;
  totalSize: number;
  averageSize: number;
  oldestVideo: Date | null;
  newestVideo: Date | null;
}

export const LocalStorageManager = () => {
  const [videos, setVideos] = useState<LocalVideoMetadata[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      await localVideoStorageService.initialize();

      const [videoList, storageStats] = await Promise.all([
        localVideoStorageService.getAllVideos(),
        localVideoStorageService.getStorageStats(),
      ]);

      setVideos(videoList);
      setStats(storageStats);
    } catch (error) {
      console.error("Failed to load videos:", error);
      toast({
        title: "Error",
        description: "Failed to load stored videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (sessionId: string) => {
    try {
      await localVideoStorageService.deleteVideo(sessionId);
      await loadVideos(); // Reload the list

      toast({
        title: "Video Deleted",
        description: "Video has been removed from local storage",
      });
    } catch (error) {
      console.error("Failed to delete video:", error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const handleExportVideo = async (sessionId: string) => {
    try {
      const videoData = await localVideoStorageService.exportVideoData(
        sessionId
      );

      // Create download link
      const link = document.createElement("a");
      link.href = videoData.videoUrl;
      link.download = `interview-${sessionId}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Video Exported",
        description: "Video has been downloaded to your device",
      });
    } catch (error) {
      console.error("Failed to export video:", error);
      toast({
        title: "Error",
        description: "Failed to export video",
        variant: "destructive",
      });
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all stored videos? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await localVideoStorageService.clearAllVideos();
      await loadVideos();

      toast({
        title: "All Videos Deleted",
        description: "All videos have been removed from local storage",
      });
    } catch (error) {
      console.error("Failed to clear videos:", error);
      toast({
        title: "Error",
        description: "Failed to clear videos",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Local Storage Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading videos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage Statistics
            </CardTitle>
            <CardDescription>
              Overview of your local video storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{stats.totalVideos}</div>
                <div className="text-sm text-muted-foreground">
                  Total Videos
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatFileSize(stats.totalSize)}
                </div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatFileSize(stats.averageSize)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average Size
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats.totalVideos > 0
                    ? `${Math.round(
                        (stats.totalSize / (1024 * 1024 * 1024)) * 100
                      )}%`
                    : "0%"}
                </div>
                <div className="text-sm text-muted-foreground">
                  of 1GB Limit
                </div>
              </div>
            </div>

            {stats.totalVideos > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Usage</span>
                  <span>{formatFileSize(stats.totalSize)} / 1GB</span>
                </div>
                <Progress
                  value={(stats.totalSize / (1024 * 1024 * 1024)) * 100}
                  className="h-2"
                />
              </div>
            )}

            {stats.totalVideos > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Videos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video List */}
      <Card>
        <CardHeader>
          <CardTitle>Stored Videos</CardTitle>
          <CardDescription>
            {videos.length === 0
              ? "No videos stored locally yet"
              : `${videos.length} video${
                  videos.length === 1 ? "" : "s"
                } stored locally`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No videos stored locally yet</p>
              <p className="text-sm">Record an interview to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.sessionId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Interview Session</h4>
                      {video.aiFeedback && (
                        <Badge variant="secondary">
                          Score: {video.aiFeedback.overallScore}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Recorded: {formatDate(video.timestamp)}</div>
                      <div>
                        Size: {formatFileSize(video.size)} • Format:{" "}
                        {video.format}
                      </div>
                      {video.transcription && (
                        <div className="truncate max-w-md">
                          Transcript:{" "}
                          {video.transcription.text.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportVideo(video.sessionId)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to results page with this video
                        window.location.href = `/results/${video.sessionId}`;
                      }}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteVideo(video.sessionId)}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Local Storage Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>
              <strong>Benefits of Local Storage:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>No file size limits (unlike cloud storage)</li>
              <li>Faster access and processing</li>
              <li>Privacy - videos stay on your device</li>
              <li>Offline access to your recordings</li>
            </ul>
          </div>

          <div className="text-sm space-y-2">
            <p>
              <strong>Storage Limits:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Browser typically allows 50-80% of available disk space</li>
              <li>IndexedDB can store much larger files than localStorage</li>
              <li>Videos are compressed automatically for optimal storage</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalStorageManager;
