import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Bookmark,
  BookmarkCheck,
  Settings,
  Eye,
  Mic,
  TrendingUp,
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SessionData {
  id: string;
  title: string;
  duration: number;
  videoUrl: string;
  transcript: TranscriptSegment[];
  analysis: SessionAnalysis;
  bookmarks: Bookmark[];
}

interface TranscriptSegment {
  id: string;
  timestamp: number;
  text: string;
  speaker: "user" | "ai";
  confidence: number;
  emotions?: string[];
}

interface SessionAnalysis {
  overallScore: number;
  speakingPace: number;
  fillerWords: number;
  eyeContact: number;
  emotionTimeline: EmotionData[];
  gestureAnalysis: GestureData[];
  keywordMatches: string[];
}

interface EmotionData {
  timestamp: number;
  emotion: string;
  confidence: number;
}

interface GestureData {
  timestamp: number;
  gesture: string;
  confidence: number;
}

interface Bookmark {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  category: "strength" | "improvement" | "question" | "note";
}

const SessionReview = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("transcript");
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real app, this would come from your backend
  useEffect(() => {
    const mockSessionData: SessionData = {
      id: sessionId || "1",
      title: "Technical Interview - Software Engineer",
      duration: 1800, // 30 minutes
      videoUrl: "/api/video/sample.mp4",
      transcript: [
        {
          id: "1",
          timestamp: 0,
          text: "Welcome to your mock interview. Please introduce yourself.",
          speaker: "ai",
          confidence: 0.95,
        },
        {
          id: "2",
          timestamp: 5,
          text: "Hello, thank you for having me. I'm a software engineer with 5 years of experience...",
          speaker: "user",
          confidence: 0.88,
          emotions: ["confident", "professional"],
        },
        {
          id: "3",
          timestamp: 45,
          text: "That's great. Can you tell me about a challenging project you worked on?",
          speaker: "ai",
          confidence: 0.92,
        },
        {
          id: "4",
          timestamp: 50,
          text: "Sure. One challenging project was migrating our legacy system to microservices...",
          speaker: "user",
          confidence: 0.85,
          emotions: ["thoughtful", "engaged"],
        },
      ],
      analysis: {
        overallScore: 82,
        speakingPace: 145,
        fillerWords: 12,
        eyeContact: 88,
        emotionTimeline: [
          { timestamp: 5, emotion: "confident", confidence: 0.9 },
          { timestamp: 50, emotion: "thoughtful", confidence: 0.85 },
          { timestamp: 120, emotion: "engaged", confidence: 0.88 },
        ],
        gestureAnalysis: [
          { timestamp: 10, gesture: "hand_gesture", confidence: 0.8 },
          { timestamp: 60, gesture: "eye_contact", confidence: 0.9 },
        ],
        keywordMatches: [
          "microservices",
          "scalability",
          "team leadership",
          "problem solving",
        ],
      },
      bookmarks: [
        {
          id: "1",
          timestamp: 45,
          title: "Great STAR example",
          description:
            "Excellent use of the STAR method for the project question",
          category: "strength",
        },
        {
          id: "2",
          timestamp: 120,
          title: "Too many filler words",
          description: "Used 'um' and 'uh' frequently in this section",
          category: "improvement",
        },
      ],
    };

    setTimeout(() => {
      setSessionData(mockSessionData);
      setIsLoading(false);
    }, 1000);
  }, [sessionId]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const handleBookmarkToggle = (timestamp: number) => {
    const existingBookmark = sessionData?.bookmarks.find(
      (b) => Math.abs(b.timestamp - timestamp) < 5
    );

    if (existingBookmark) {
      // Remove bookmark
      setSessionData((prev) =>
        prev
          ? {
              ...prev,
              bookmarks: prev.bookmarks.filter(
                (b) => b.id !== existingBookmark.id
              ),
            }
          : null
      );
      toast({
        title: "Bookmark Removed",
        description: "Bookmark has been removed from this timestamp",
      });
    } else {
      // Add bookmark
      const newBookmark: Bookmark = {
        id: Date.now().toString(),
        timestamp,
        title: "Custom Bookmark",
        description:
          "Added at " +
          Math.floor(timestamp / 60) +
          ":" +
          (timestamp % 60).toString().padStart(2, "0"),
        category: "note",
      };

      setSessionData((prev) =>
        prev
          ? {
              ...prev,
              bookmarks: [...prev.bookmarks, newBookmark],
            }
          : null
      );

      toast({
        title: "Bookmark Added",
        description: "Bookmark added to this timestamp",
      });
    }
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEmotionColor = (emotion: string) => {
    const colors = {
      confident: "bg-green-500",
      thoughtful: "bg-blue-500",
      engaged: "bg-purple-500",
      nervous: "bg-orange-500",
      excited: "bg-pink-500",
    };
    return colors[emotion as keyof typeof colors] || "bg-gray-500";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      strength: "bg-green-500",
      improvement: "bg-orange-500",
      question: "bg-blue-500",
      note: "bg-gray-500",
    };
    return colors[category as keyof typeof colors] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Loading Session</h2>
            <p className="text-muted-foreground">
              Preparing your interview review...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!sessionData) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="glass"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{sessionData.title}</h1>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(sessionData.duration)}
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {sessionData.transcript.length} segments
            </div>
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              {sessionData.bookmarks.length} bookmarks
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Video Container */}
            <Card className="p-6">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  onTimeUpdate={(e) =>
                    setCurrentTime(e.currentTarget.currentTime)
                  }
                  onLoadedMetadata={(e) =>
                    setDuration(e.currentTarget.duration)
                  }
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  <source src={sessionData.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                {/* Video Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <Progress
                      value={(currentTime / duration) * 100}
                      className="h-1 mb-2"
                    />
                    <div className="flex items-center justify-between text-white text-sm">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  className="glass"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => jumpToTimestamp(Math.max(0, currentTime - 10))}
                  className="glass"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    jumpToTimestamp(Math.min(duration, currentTime + 10))
                  }
                  className="glass"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    onValueChange={handleSeek}
                    max={duration}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                  className="glass"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="glass"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Analysis Overlay */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Analysis Overlay</h3>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="emotions">Emotions</TabsTrigger>
                  <TabsTrigger value="gestures">Gestures</TabsTrigger>
                  <TabsTrigger value="keywords">Keywords</TabsTrigger>
                </TabsList>

                <TabsContent value="emotions" className="mt-4">
                  <div className="space-y-2">
                    {sessionData.analysis.emotionTimeline.map(
                      (emotion, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => jumpToTimestamp(emotion.timestamp)}
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${getEmotionColor(
                              emotion.emotion
                            )}`}
                          />
                          <span className="text-sm">
                            {formatTime(emotion.timestamp)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {emotion.emotion}
                          </Badge>
                          <Progress
                            value={emotion.confidence * 100}
                            className="flex-1 h-2"
                          />
                        </div>
                      )
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="gestures" className="mt-4">
                  <div className="space-y-2">
                    {sessionData.analysis.gestureAnalysis.map(
                      (gesture, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => jumpToTimestamp(gesture.timestamp)}
                        >
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            {formatTime(gesture.timestamp)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {gesture.gesture.replace("_", " ")}
                          </Badge>
                          <Progress
                            value={gesture.confidence * 100}
                            className="flex-1 h-2"
                          />
                        </div>
                      )
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="keywords" className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {sessionData.analysis.keywordMatches.map(
                      (keyword, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-sm"
                        >
                          {keyword}
                        </Badge>
                      )
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Session Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Session Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Overall Score
                  </span>
                  <span className="font-bold text-green-500">
                    {sessionData.analysis.overallScore}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Speaking Pace
                  </span>
                  <span className="font-bold">
                    {sessionData.analysis.speakingPace} wpm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Filler Words
                  </span>
                  <span className="font-bold text-orange-500">
                    {sessionData.analysis.fillerWords}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Eye Contact
                  </span>
                  <span className="font-bold text-blue-500">
                    {sessionData.analysis.eyeContact}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Transcript */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Transcript</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessionData.transcript.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      Math.abs(segment.timestamp - currentTime) < 5
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => jumpToTimestamp(segment.timestamp)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          segment.speaker === "user" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {segment.speaker === "user" ? "You" : "AI"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(segment.timestamp)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmarkToggle(segment.timestamp);
                        }}
                      >
                        {sessionData.bookmarks.some(
                          (b) => Math.abs(b.timestamp - segment.timestamp) < 5
                        ) ? (
                          <BookmarkCheck className="w-3 h-3 text-primary" />
                        ) : (
                          <Bookmark className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm">{segment.text}</p>
                    {segment.emotions && (
                      <div className="flex gap-1 mt-2">
                        {segment.emotions.map((emotion, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Bookmarks */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Bookmarks</h3>
              <div className="space-y-3">
                {sessionData.bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => jumpToTimestamp(bookmark.timestamp)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getCategoryColor(
                          bookmark.category
                        )}`}
                      />
                      <span className="text-sm font-medium">
                        {bookmark.title}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatTime(bookmark.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bookmark.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="glass">
                <Download className="w-4 h-4 mr-2" />
                Download Video
              </Button>
              <Button variant="outline" className="glass">
                <Share2 className="w-4 h-4 mr-2" />
                Share Session
              </Button>
              <Button variant="outline" className="glass">
                <Mail className="w-4 h-4 mr-2" />
                Email Report
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Video Settings</DialogTitle>
            <DialogDescription>
              Adjust playback speed and other video settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Playback Speed</label>
              <div className="flex gap-2">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Volume</label>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionReview;
