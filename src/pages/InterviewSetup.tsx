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
    <div className="min-h-screen bg-gradient-to-br from-light-gray via-white to-light-gray/50">
      <div className="container mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="w-16 h-16 bg-primary-blue/10 rounded-professional flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary-blue" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-dark-navy font-display mb-3">
                Set Up Your Interview
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Choose your interview type and customize the experience to match
                your goals
              </p>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Interview Type Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-blue/10 rounded-professional">
                  <Target className="w-5 h-5 text-primary-blue" />
                </div>
                <h2 className="text-xl font-bold text-dark-navy font-display">
                  Interview Type
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interviewTypes.map((type, index) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-300 p-4 bg-white/90 backdrop-blur-sm border border-light-gray/50 rounded-professional group ${
                        selectedType === type.id
                          ? "ring-2 ring-primary-blue bg-primary-blue/5 shadow-professional-lg"
                          : "hover:shadow-professional hover:border-primary-blue/30"
                      }`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-professional flex items-center justify-center transition-all duration-300 ${
                            selectedType === type.id
                              ? "bg-primary-blue text-white shadow-professional"
                              : "bg-light-gray text-muted-foreground group-hover:bg-primary-blue/10 group-hover:text-primary-blue"
                          }`}
                        >
                          <type.icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-base mb-1 text-dark-navy">
                            {type.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                            {type.description}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">
                              {type.estimatedDuration}
                            </span>
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
                            className="mt-3 pt-3 border-t border-light-gray/50"
                          >
                            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                              {type.details}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-xs bg-accent-green/10 text-accent-green border-accent-green/20"
                              >
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
                              {selectedType === type.id && (
                                <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Configuration Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent-green/10 rounded-professional">
                  <Sliders className="w-5 h-5 text-accent-green" />
                </div>
                <h2 className="text-xl font-bold text-dark-navy font-display">
                  Configuration
                </h2>
              </div>

              <Card className="p-4 space-y-4 bg-white/90 backdrop-blur-sm border border-light-gray/50 rounded-professional shadow-professional">
                {/* Question Source Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-dark-navy">
                    Question Source
                  </Label>
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
                      className={`flex-1 transition-all duration-300 ${
                        !config.useCustomQuestions
                          ? "bg-primary-blue hover:bg-primary-blue/90 text-white shadow-professional"
                          : "bg-white/50 border-light-gray/50 hover:bg-primary-blue/5 hover:border-primary-blue/30"
                      }`}
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
                      className={`flex-1 transition-all duration-300 ${
                        config.useCustomQuestions
                          ? "bg-primary-blue hover:bg-primary-blue/90 text-white shadow-professional"
                          : "bg-white/50 border-light-gray/50 hover:bg-primary-blue/5 hover:border-primary-blue/30"
                      }`}
                    >
                      Use My Custom Questions
                    </Button>
                  </div>
                </div>

                {/* Field Selection for Custom Interview Type */}
                {selectedType === "custom" && !config.useCustomQuestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <Label className="text-sm font-medium text-dark-navy">
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
                          className={`transition-all duration-300 ${
                            config.selectedField === field.id
                              ? "bg-accent-green hover:bg-accent-green/90 text-white shadow-professional"
                              : "bg-white/50 border-light-gray/50 hover:bg-accent-green/5 hover:border-accent-green/30"
                          }`}
                        >
                          {field.name}
                        </Button>
                      ))}
                    </div>
                    {config.selectedField && (
                      <div className="p-3 bg-accent-green/5 border border-accent-green/20 rounded-professional">
                        <p className="text-xs text-accent-green font-medium">
                          <span className="font-bold">
                            {questionCounts.custom[config.selectedField] || 0}
                          </span>{" "}
                          questions available for{" "}
                          <span className="font-bold">
                            {
                              availableFields.find(
                                (f) => f.id === config.selectedField
                              )?.name
                            }
                          </span>
                        </p>
                      </div>
                    )}
                  </motion.div>
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-dark-navy">
                    Duration
                  </Label>
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
                        className={`transition-all duration-300 ${
                          config.duration === duration
                            ? "bg-accent-orange hover:bg-accent-orange/90 text-white shadow-professional"
                            : "bg-white/50 border-light-gray/50 hover:bg-accent-orange/5 hover:border-accent-orange/30"
                        }`}
                      >
                        {duration}m
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-dark-navy">
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
                      className="min-w-[3rem] justify-center bg-primary-blue/10 text-primary-blue border-primary-blue/20 font-bold"
                    >
                      {config.questionCount}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Button
                size="lg"
                onClick={handleStartInterview}
                disabled={!selectedType || !isCustomQuestionsValid()}
                className="bg-primary-blue hover:bg-primary-blue/90 text-white px-10 py-4 h-auto rounded-professional shadow-professional hover:shadow-professional-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Interview
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Pre-interview Checklist Modal */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-light-gray/50 rounded-professional shadow-professional-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-accent-green/10 rounded-professional">
                <Check className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-dark-navy font-display">
                  Pre-Interview Checklist
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Make sure everything is ready for your interview
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-light-gray rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-accent-green to-accent-green/80 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      (Object.values(checklistItems).filter(Boolean).length /
                        Object.keys(checklistItems).length) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
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
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 cursor-pointer hover:bg-primary-blue/5 p-3 rounded-professional transition-all duration-300 group"
                  onClick={() => handleChecklistToggle(item.key)}
                >
                  <div
                    className={`w-6 h-6 rounded-professional border-2 flex items-center justify-center transition-all duration-300 ${
                      item.checked
                        ? "bg-accent-green border-accent-green text-white shadow-professional"
                        : "border-primary-blue/30 bg-white hover:border-accent-green group-hover:bg-accent-green/10 group-hover:border-accent-green"
                    }`}
                  >
                    {item.checked && <Check className="w-4 h-4" />}
                  </div>
                  <span className="text-sm select-none text-dark-navy font-medium">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {!isAllChecklistItemsCompleted() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-professional p-4"
              >
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">
                    Please complete all checklist items to begin your interview.
                  </span>
                </div>
              </motion.div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowChecklist(false)}
                className="flex-1 bg-white/50 border-light-gray/50 hover:bg-primary-blue/5 hover:border-primary-blue/30 rounded-professional"
              >
                Go Back
              </Button>
              <Button
                onClick={handleBeginInterview}
                disabled={isStarting || !isAllChecklistItemsCompleted()}
                className="flex-1 bg-primary-blue hover:bg-primary-blue/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-professional shadow-professional"
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
