import { useState, useEffect } from "react";
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
  X,
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
import {
  getAvailableFields,
  getQuestionCountByType,
  getQuestionCountByCustomDomain,
  type Field,
} from "@/services/questionBankService";
// Removed InterviewContext import - using direct configuration flow

interface InterviewType {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  details: string;
  estimatedDuration: string;
  questionCount?: number; // Make optional since we'll fetch dynamically
}

interface InterviewConfig {
  type: string;
  duration: number;
  questionCount: number;
  useCustomQuestions: boolean;
  customQuestions: string[];
  selectedField?: string; // For custom interview type
}

const InterviewSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Removed InterviewContext integration - using direct configuration flow

  const [selectedType, setSelectedType] = useState<string>("");
  const [showChecklist, setShowChecklist] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraTest, setCameraTest] = useState(false);
  const [audioTest, setAudioTest] = useState(false);
  const [newCustomQuestion, setNewCustomQuestion] = useState("");
  const [checklistItems, setChecklistItems] = useState({
    cameraAudio: false,
    environment: false,
    internet: false,
    materials: false,
  });

  const [config, setConfig] = useState<InterviewConfig>({
    type: "",
    duration: 15,
    questionCount: 3, // Default to 3 questions for easier testing
    useCustomQuestions: false,
    customQuestions: [],
    selectedField: "",
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
    },
    {
      id: "technical",
      name: "Technical",
      icon: Code,
      description: "Coding challenges and system design",
      details:
        "Technical questions covering algorithms, data structures, system design, and problem-solving skills.",
      estimatedDuration: "45-60 min",
    },
    {
      id: "leadership",
      name: "Leadership",
      icon: Award,
      description: "Management and team leadership scenarios",
      details:
        "Questions about team management, decision-making, conflict resolution, and strategic thinking.",
      estimatedDuration: "25-35 min",
    },
    {
      id: "custom",
      name: "Custom",
      icon: Settings,
      description: "Tailored questions for your specific role",
      details:
        "Create a personalized interview based on your industry, role, and experience level.",
      estimatedDuration: "30-45 min",
    },
  ];

  const durations = [15, 30, 45, 60];
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [questionCounts, setQuestionCounts] = useState<{
    behavioral: number;
    technical: number;
    leadership: number;
    custom: Record<string, number>;
  }>({
    behavioral: 0,
    technical: 0,
    leadership: 0,
    custom: {},
  });

  // Load available fields and question counts on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load available fields
        const fields = await getAvailableFields();
        setAvailableFields(fields);

        // Load question counts for standard interview types
        const [behavioralCount, technicalCount, leadershipCount] =
          await Promise.all([
            getQuestionCountByType("behavioral"),
            getQuestionCountByType("technical"),
            getQuestionCountByType("leadership"),
          ]);

        // Load question counts for custom domains
        const customCounts: Record<string, number> = {};
        for (const field of fields) {
          const count = await getQuestionCountByCustomDomain(
            field.id as
              | "product_manager"
              | "software_engineer"
              | "data_scientist"
              | "ui_ux_designer"
              | "devops_engineer"
              | "ai_engineer"
          );
          customCounts[field.id] = count;
        }

        setQuestionCounts({
          behavioral: behavioralCount,
          technical: technicalCount,
          leadership: leadershipCount,
          custom: customCounts,
        });

        console.log("Loaded question counts:", {
          behavioral: behavioralCount,
          technical: technicalCount,
          leadership: leadershipCount,
          custom: customCounts,
        });
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const handleTypeSelect = (typeId: string) => {
    const type = interviewTypes.find((t) => t.id === typeId);
    setSelectedType(typeId);

    // Get the appropriate question count for this type
    let newQuestionCount = 15; // Default
    if (typeId === "custom" && config.selectedField) {
      newQuestionCount = questionCounts.custom[config.selectedField] || 15;
    } else if (
      typeId === "behavioral" ||
      typeId === "technical" ||
      typeId === "leadership"
    ) {
      newQuestionCount =
        questionCounts[typeId as "behavioral" | "technical" | "leadership"] ||
        15;
    }

    setConfig((prev) => ({
      ...prev,
      type: typeId,
      duration: prev.duration, // Keep user's duration selection
      questionCount: newQuestionCount, // Use dynamic question count
    }));
  };

  const handleCustomQuestionAdd = () => {
    if (newCustomQuestion.trim()) {
      // Check if we've reached the selected question count
      if (config.customQuestions.length >= config.questionCount) {
        toast({
          title: "Question Limit Reached",
          description: `You have selected ${config.questionCount} questions and cannot add more.`,
          variant: "destructive",
        });
        return;
      }

      // Check if we've reached the maximum limit of 15 questions
      if (config.customQuestions.length >= 15) {
        toast({
          title: "Maximum Questions Reached",
          description: "You can add a maximum of 15 custom questions.",
          variant: "destructive",
        });
        return;
      }

      setConfig((prev) => ({
        ...prev,
        customQuestions: [...prev.customQuestions, newCustomQuestion.trim()],
      }));
      setNewCustomQuestion("");
    }
  };

  const handleCustomQuestionRemove = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((_, i) => i !== index),
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

  const isCustomQuestionsValid = () => {
    if (!config.useCustomQuestions) return true;
    return config.customQuestions.length === config.questionCount;
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

    if (
      selectedType === "custom" &&
      !config.useCustomQuestions &&
      !config.selectedField
    ) {
      toast({
        title: "Select Field",
        description: "Please select a field for your custom interview.",
        variant: "destructive",
      });
      return;
    }

    if (config.useCustomQuestions && !isCustomQuestionsValid()) {
      if (config.customQuestions.length === 0) {
        toast({
          title: "Add Custom Questions",
          description: "Please add at least one custom question to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Question Count Mismatch",
          description: `You have selected ${config.questionCount} questions but added ${config.customQuestions.length} custom questions. Please add exactly ${config.questionCount} questions.`,
          variant: "destructive",
        });
      }
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
                              {type.id === "custom"
                                ? "Multiple domains available"
                                : `${
                                    questionCounts[
                                      type.id as
                                        | "behavioral"
                                        | "technical"
                                        | "leadership"
                                    ] || 0
                                  } questions`}
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
                {/* Question Source Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Question Source</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={
                        !config.useCustomQuestions ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          useCustomQuestions: false,
                        }))
                      }
                      className="flex-1"
                    >
                      Use App Default Questions
                    </Button>
                    <Button
                      variant={
                        config.useCustomQuestions ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          useCustomQuestions: true,
                        }))
                      }
                      className="flex-1"
                    >
                      Use My Custom Questions
                    </Button>
                  </div>
                </div>

                {/* Field Selection for Custom Interview Type */}
                {selectedType === "custom" && !config.useCustomQuestions && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select Your Field
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableFields.map((field) => (
                        <Button
                          key={field.id}
                          variant={
                            config.selectedField === field.id
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              selectedField: field.id,
                            }))
                          }
                        >
                          {field.name}
                        </Button>
                      ))}
                    </div>
                    {config.selectedField && (
                      <p className="text-xs text-muted-foreground">
                        {questionCounts.custom[config.selectedField] || 0}{" "}
                        questions available for{" "}
                        {
                          availableFields.find(
                            (f) => f.id === config.selectedField
                          )?.name
                        }
                      </p>
                    )}
                  </div>
                )}

                {/* Custom Questions Input */}
                {config.useCustomQuestions && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Your Custom Questions
                    </Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter your interview question..."
                          value={newCustomQuestion}
                          onChange={(e) => setNewCustomQuestion(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            newCustomQuestion.trim() &&
                            config.customQuestions.length <
                              config.questionCount &&
                            config.customQuestions.length < 15 &&
                            handleCustomQuestionAdd()
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleCustomQuestionAdd}
                          size="sm"
                          disabled={
                            !newCustomQuestion.trim() ||
                            config.customQuestions.length >=
                              config.questionCount ||
                            config.customQuestions.length >= 15
                          }
                        >
                          Add
                        </Button>
                      </div>

                      {/* Custom Questions List */}
                      {config.customQuestions.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {config.customQuestions.map((question, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-muted rounded-lg"
                            >
                              <span className="text-sm flex-1">{question}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCustomQuestionRemove(index)
                                }
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {config.customQuestions.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No custom questions added yet. Add exactly{" "}
                          {config.questionCount} questions above.
                        </p>
                      )}

                      {config.customQuestions.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {config.customQuestions.length} of{" "}
                          {config.questionCount} questions added.
                          {config.customQuestions.length <
                            config.questionCount &&
                            ` Add ${
                              config.questionCount -
                              config.customQuestions.length
                            } more questions.`}
                          {config.customQuestions.length ===
                            config.questionCount &&
                            " ✓ Ready to start interview!"}
                        </p>
                      )}

                      {config.customQuestions.length >= config.questionCount &&
                        config.customQuestions.length > 0 && (
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Question limit reached! You have added all{" "}
                            {config.questionCount} questions.
                          </p>
                        )}
                    </div>
                  </div>
                )}

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
                      >
                        {duration}m
                      </Button>
                    ))}
                  </div>
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
                      min={1}
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
              </Card>
            </div>
          </div>

          {/* Start Button */}
          <div className="mt-12 text-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                onClick={handleStartInterview}
                disabled={!selectedType || !isCustomQuestionsValid()}
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
