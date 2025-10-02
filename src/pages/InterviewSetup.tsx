import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Code,
  Award,
  Settings,
  Clock,
  Sliders,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  AlertTriangle,
  Globe,
  Target,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface InterviewType {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  details: string;
  estimatedDuration: string;
  questionCount: number;
}

interface InterviewConfig {
  type: string;
  difficulty: number;
  duration: number;
  industry: string;
  questionCount: number;
  aiFollowUp: boolean;
  focusAreas: string[];
  language: string;
}

const InterviewSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedType, setSelectedType] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraTest, setCameraTest] = useState(false);
  const [audioTest, setAudioTest] = useState(false);
  const [checklistItems, setChecklistItems] = useState({
    cameraAudio: false,
    environment: false,
    internet: false,
    materials: false,
  });

  const [config, setConfig] = useState<InterviewConfig>({
    type: "",
    difficulty: 3,
    duration: 30,
    industry: "",
    questionCount: 8,
    aiFollowUp: true,
    focusAreas: [],
    language: "en",
  });

  const interviewTypes: InterviewType[] = [
    {
      id: "behavioral",
      name: "Behavioral",
      icon: Users,
      description: "STAR method questions about past experiences",
      details:
        "Practice answering behavioral questions using the STAR method (Situation, Task, Action, Result). Perfect for leadership and teamwork scenarios.",
      estimatedDuration: "20-30 min",
      questionCount: 6,
    },
    {
      id: "technical",
      name: "Technical",
      icon: Code,
      description: "Coding challenges and system design",
      details:
        "Technical questions covering algorithms, data structures, system design, and problem-solving skills.",
      estimatedDuration: "45-60 min",
      questionCount: 10,
    },
    {
      id: "leadership",
      name: "Leadership",
      icon: Award,
      description: "Management and team leadership scenarios",
      details:
        "Questions about team management, decision-making, conflict resolution, and strategic thinking.",
      estimatedDuration: "25-35 min",
      questionCount: 7,
    },
    {
      id: "custom",
      name: "Custom",
      icon: Settings,
      description: "Tailored questions for your specific role",
      details:
        "Create a personalized interview based on your industry, role, and experience level.",
      estimatedDuration: "30-45 min",
      questionCount: 8,
    },
  ];

  const industries = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "Marketing",
    "Sales",
    "Design",
    "Consulting",
    "Non-profit",
    "Government",
  ];

  const focusAreas = [
    "Communication",
    "Problem Solving",
    "Leadership",
    "Technical Skills",
    "Teamwork",
    "Time Management",
    "Adaptability",
    "Creativity",
  ];

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
  ];

  const durations = [15, 30, 45, 60];

  const handleTypeSelect = (typeId: string) => {
    const type = interviewTypes.find((t) => t.id === typeId);
    setSelectedType(typeId);
    setConfig((prev) => ({
      ...prev,
      type: typeId,
      duration: type?.estimatedDuration.includes("45-60") ? 45 : 30,
      questionCount: type?.questionCount || 8,
    }));
  };

  const handleFocusAreaToggle = (area: string) => {
    setConfig((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((a) => a !== area)
        : [...prev.focusAreas, area],
    }));
  };

  const handleChecklistToggle = (item: keyof typeof checklistItems) => {
    setChecklistItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleCameraTest = () => {
    const newCameraTest = !cameraTest;
    setCameraTest(newCameraTest);

    // Update checklist when both camera and audio are tested
    if (newCameraTest && audioTest) {
      setChecklistItems((prev) => ({
        ...prev,
        cameraAudio: true,
      }));
    } else if (!newCameraTest) {
      setChecklistItems((prev) => ({
        ...prev,
        cameraAudio: false,
      }));
    }
  };

  const handleAudioTest = () => {
    const newAudioTest = !audioTest;
    setAudioTest(newAudioTest);

    // Update checklist when both camera and audio are tested
    if (newAudioTest && cameraTest) {
      setChecklistItems((prev) => ({
        ...prev,
        cameraAudio: true,
      }));
    } else if (!newAudioTest) {
      setChecklistItems((prev) => ({
        ...prev,
        cameraAudio: false,
      }));
    }
  };

  const isAllChecklistItemsCompleted = () => {
    return Object.values(checklistItems).every((item) => item === true);
  };

  const handleStartInterview = async () => {
    if (!selectedType) {
      toast({
        title: "Select Interview Type",
        description: "Please choose an interview type to continue.",
        variant: "destructive",
      });
      return;
    }

    setShowChecklist(true);
  };

  const handleBeginInterview = () => {
    if (!isAllChecklistItemsCompleted()) {
      toast({
        title: "Complete Checklist",
        description:
          "Please check all items in the pre-interview checklist before starting.",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    setTimeout(() => {
      try {
        // Only pass serializable data to avoid DataCloneError
        const selectedInterviewType = interviewTypes.find(
          (t) => t.id === selectedType
        );
        const serializableData = {
          config,
          type: selectedInterviewType
            ? {
                id: selectedInterviewType.id,
                name: selectedInterviewType.name,
                description: selectedInterviewType.description,
                details: selectedInterviewType.details,
                estimatedDuration: selectedInterviewType.estimatedDuration,
                questionCount: selectedInterviewType.questionCount,
              }
            : null,
        };

        console.log(
          "Navigating to interview session with data:",
          serializableData
        );

        // Store data in sessionStorage as fallback
        sessionStorage.setItem(
          "interviewConfig",
          JSON.stringify(serializableData)
        );

        navigate("/interview/session", {
          state: serializableData,
        });
      } catch (error) {
        console.error("Navigation error:", error);
        toast({
          title: "Navigation Error",
          description: "Failed to start interview session. Please try again.",
          variant: "destructive",
        });
        setIsStarting(false);
      }
    }, 1500);
  };

  const selectedInterviewType = interviewTypes.find(
    (t) => t.id === selectedType
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Set Up Your <span className="gradient-text">Interview</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose your interview type and customize the experience to match
              your goals
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Interview Type Selection */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Interview Type
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interviewTypes.map((type) => (
                  <motion.div
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-300 p-6 ${
                        selectedType === type.id
                          ? "ring-2 ring-primary bg-primary/5 border-primary"
                          : "hover:shadow-lg hover:border-primary/50"
                      }`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            selectedType === type.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <type.icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">
                            {type.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {type.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {type.estimatedDuration}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedType === type.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t"
                          >
                            <p className="text-sm text-muted-foreground mb-2">
                              {type.details}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {type.questionCount} questions
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Configuration Panel */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sliders className="w-6 h-6 text-primary" />
                Configuration
              </h2>

              <Card className="p-6 space-y-6">
                {/* Difficulty Slider */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Difficulty Level
                  </Label>
                  <div className="space-y-2">
                    <Slider
                      value={[config.difficulty]}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, difficulty: value[0] }))
                      }
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Beginner</span>
                      <span>Expert</span>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="outline" className="text-sm">
                        Level {config.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Duration</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {durations.map((duration) => (
                      <Button
                        key={duration}
                        variant={
                          config.duration === duration ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, duration }))
                        }
                        className="glass"
                      >
                        {duration}m
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Industry/Role Dropdown */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Industry/Role</Label>
                  <Select
                    value={config.industry}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, industry: value }))
                    }
                  >
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Count */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Number of Questions
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.questionCount]}
                      onValueChange={(value) =>
                        setConfig((prev) => ({
                          ...prev,
                          questionCount: value[0],
                        }))
                      }
                      max={15}
                      min={3}
                      step={1}
                      className="flex-1"
                    />
                    <Badge
                      variant="outline"
                      className="min-w-[3rem] justify-center"
                    >
                      {config.questionCount}
                    </Badge>
                  </div>
                </div>

                {/* AI Follow-up Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      AI Follow-up Questions
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get personalized follow-up questions
                    </p>
                  </div>
                  <Switch
                    checked={config.aiFollowUp}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, aiFollowUp: checked }))
                    }
                  />
                </div>

                {/* Advanced Settings */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 h-auto"
                    >
                      <span className="font-medium">Advanced Settings</span>
                      {showAdvanced ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {/* Focus Areas */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Focus Areas</Label>
                      <div className="flex flex-wrap gap-2">
                        {focusAreas.map((area) => (
                          <Badge
                            key={area}
                            variant={
                              config.focusAreas.includes(area)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => handleFocusAreaToggle(area)}
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Language Preference */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Language
                      </Label>
                      <Select
                        value={config.language}
                        onValueChange={(value) =>
                          setConfig((prev) => ({ ...prev, language: value }))
                        }
                      >
                        <SelectTrigger className="glass">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Camera/Audio Test */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Device Test</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCameraTest}
                          className="flex-1"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {cameraTest ? "Camera OK" : "Test Camera"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAudioTest}
                          className="flex-1"
                        >
                          <Mic className="w-4 h-4 mr-2" />
                          {audioTest ? "Audio OK" : "Test Audio"}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          </div>

          {/* Start Button */}
          <div className="mt-12 text-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                onClick={handleStartInterview}
                disabled={!selectedType}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-12 py-6 h-auto"
              >
                <Play className="w-6 h-6 mr-3" />
                Start Interview
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Pre-interview Checklist Modal */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pre-Interview Checklist</DialogTitle>
            <DialogDescription>
              Make sure everything is ready for your interview
            </DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (Object.values(checklistItems).filter(Boolean).length /
                        Object.keys(checklistItems).length) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {Object.values(checklistItems).filter(Boolean).length}/
                {Object.keys(checklistItems).length}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  key: "cameraAudio" as keyof typeof checklistItems,
                  label: "Camera and microphone working",
                  checked: checklistItems.cameraAudio,
                },
                {
                  key: "environment" as keyof typeof checklistItems,
                  label: "Good lighting and quiet environment",
                  checked: checklistItems.environment,
                },
                {
                  key: "internet" as keyof typeof checklistItems,
                  label: "Stable internet connection",
                  checked: checklistItems.internet,
                },
                {
                  key: "materials" as keyof typeof checklistItems,
                  label: "Resume and notes ready",
                  checked: checklistItems.materials,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                  onClick={() => handleChecklistToggle(item.key)}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground hover:border-primary"
                    }`}
                  >
                    {item.checked && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-sm select-none">{item.label}</span>
                </div>
              ))}
            </div>

            {!isAllChecklistItemsCompleted() && (
              <div className="bg-muted/50 border border-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Please complete all checklist items to begin your interview.
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowChecklist(false)}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={handleBeginInterview}
                disabled={isStarting || !isAllChecklistItemsCompleted()}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Begin Interview"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewSetup;
