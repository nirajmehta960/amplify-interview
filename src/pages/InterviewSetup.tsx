import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  DESIGN_SYSTEM,
  cn,
  createMotionVariant,
  createInteractiveState,
} from "@/lib/design-system";
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
import Logo from "@/components/Logo";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  getAvailableFields,
  getQuestionCountByType,
  getQuestionCountByCustomDomain,
  type Field,
} from "@/services/questionBankService";
import {
  userQuestionBankService,
  CustomQuestion,
} from "@/services/userQuestionBankService";
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
  selectedField?: string; // For custom interview type
  useUserQuestions: boolean; // Use questions from user's question bank
  selectedUserQuestions: string[]; // Selected question IDs from user's bank
}

const InterviewSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  // Removed InterviewContext integration - using direct configuration flow

  // Color mapping for different interview types
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      Behavioral: "bg-blue-100 text-blue-800 border-blue-200",
      Technical: "bg-green-100 text-green-800 border-green-200",
      Leadership: "bg-purple-100 text-purple-800 border-purple-200",
      "Product Manager": "bg-orange-100 text-orange-800 border-orange-200",
      "Software Engineer": "bg-cyan-100 text-cyan-800 border-cyan-200",
      "Data Scientist": "bg-pink-100 text-pink-800 border-pink-200",
      "UI/UX Designer": "bg-indigo-100 text-indigo-800 border-indigo-200",
      "DevOps Engineer": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "AI Engineer": "bg-red-100 text-red-800 border-red-200",
    };
    return colorMap[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const [selectedType, setSelectedType] = useState<string>("");
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
    duration: 15,
    questionCount: 1, // Default to 1 question when no type selected
    selectedField: "",
    useUserQuestions: false,
    selectedUserQuestions: [],
  });

  // User questions state
  const [userQuestions, setUserQuestions] = useState<CustomQuestion[]>([]);
  const [loadingUserQuestions, setLoadingUserQuestions] = useState(false);

  // App questions state
  const [appQuestions, setAppQuestions] = useState<any[]>([]);
  const [loadingAppQuestions, setLoadingAppQuestions] = useState(false);
  const [selectedAppQuestions, setSelectedAppQuestions] = useState<string[]>(
    []
  );

  // Load user questions when interview type changes and user questions are enabled
  useEffect(() => {
    if (selectedType && config.useUserQuestions) {
      loadUserQuestions(selectedType);
    } else if (!selectedType && config.useUserQuestions) {
      // Clear questions if no interview type is selected
      setUserQuestions([]);
    }
  }, [selectedType, config.useUserQuestions]);

  // Load user questions when field changes for custom interviews
  useEffect(() => {
    if (
      selectedType === "custom" &&
      config.useUserQuestions &&
      config.selectedField
    ) {
      // Clear selected questions when field changes
      setConfig((prev) => ({
        ...prev,
        selectedUserQuestions: [],
      }));
      // Load questions for the new field
      loadUserQuestions(selectedType);
    }
  }, [config.selectedField, selectedType, config.useUserQuestions]);

  // Load app questions when interview type changes and app questions are enabled
  useEffect(() => {
    if (selectedType && !config.useUserQuestions) {
      loadAppQuestions(selectedType);
    } else if (!selectedType && !config.useUserQuestions) {
      // Clear questions if no interview type is selected
      setAppQuestions([]);
    }
  }, [selectedType, config.useUserQuestions]);

  // Load app questions when field changes for custom interviews
  useEffect(() => {
    if (
      selectedType === "custom" &&
      !config.useUserQuestions &&
      config.selectedField
    ) {
      // Clear selected questions when field changes
      setSelectedAppQuestions([]);
      // Load questions for the new field
      loadAppQuestions(selectedType);
    }
  }, [config.selectedField, selectedType, config.useUserQuestions]);

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

    // Set question count to 7 for any selected interview type
    const newQuestionCount = typeId ? 7 : 1;

    setConfig((prev) => ({
      ...prev,
      type: typeId,
      duration: prev.duration, // Keep user's duration selection
      questionCount: newQuestionCount, // Use 7 for selected type, 1 for no selection
    }));
  };

  const handleChecklistToggle = (item: keyof typeof checklistItems) => {
    setChecklistItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  // Load user questions based on interview type
  const loadUserQuestions = async (interviewType?: string) => {
    if (!user) return;

    const type = interviewType || selectedType;

    // Only load questions if an interview type is selected
    if (!type) {
      setUserQuestions([]);
      return;
    }

    setLoadingUserQuestions(true);
    try {
      if (type === "custom") {
        // For custom interviews, load questions based on selected field
        const selectedField = config.selectedField || "product_manager";
        const allQuestions = await userQuestionBankService.getUserQuestions(
          user.id
        );

        // Map field IDs to display names
        const fieldIdToDisplayName: Record<string, string> = {
          product_manager: "Product Manager",
          software_engineer: "Software Engineer",
          data_scientist: "Data Scientist",
          ui_ux_designer: "UI/UX Designer",
          devops_engineer: "DevOps Engineer",
          ai_engineer: "AI Engineer",
        };

        const displayName =
          fieldIdToDisplayName[selectedField] || selectedField;

        // Filter questions by the selected field display name
        const fieldQuestions = allQuestions.filter(
          (q) => q.category === displayName
        );
        setUserQuestions(fieldQuestions);
      } else {
        const questions =
          await userQuestionBankService.getQuestionsByInterviewType(
            user.id,
            type as "behavioral" | "technical" | "leadership" | "custom"
          );
        setUserQuestions(questions);
      }
    } catch (error) {
      console.error("Error loading user questions:", error);
      toast({
        title: "Error",
        description: "Failed to load your questions",
        variant: "destructive",
      });
    } finally {
      setLoadingUserQuestions(false);
    }
  };

  // Load app questions based on interview type
  const loadAppQuestions = async (interviewType?: string) => {
    const type = interviewType || selectedType;

    // Only load questions if an interview type is selected
    if (!type) {
      setAppQuestions([]);
      return;
    }

    setLoadingAppQuestions(true);
    try {
      const questionDatabaseService = await import(
        "../services/questionDatabaseService"
      );

      if (type === "custom") {
        // For custom interviews, load questions based on selected field
        const selectedField = config.selectedField || "product_manager";
        const allQuestions =
          await questionDatabaseService.getQuestionsForInterview(
            "custom",
            false,
            [],
            selectedField
          );
        setAppQuestions(allQuestions);
      } else {
        const questions =
          await questionDatabaseService.getQuestionsForInterview(
            type as "behavioral" | "technical" | "leadership",
            false,
            [],
            "product_manager"
          );
        setAppQuestions(questions);
      }
    } catch (error) {
      console.error("Error loading app questions:", error);
      toast({
        title: "Error",
        description: "Failed to load app questions",
        variant: "destructive",
      });
    } finally {
      setLoadingAppQuestions(false);
    }
  };

  // Handle question source change
  const handleQuestionSourceChange = (source: "app" | "user") => {
    setConfig((prev) => ({
      ...prev,
      useUserQuestions: source === "user",
      selectedUserQuestions:
        source === "user" ? prev.selectedUserQuestions : [],
    }));

    if (source === "user" && selectedType) {
      loadUserQuestions();
    } else if (source === "app" && selectedType) {
      loadAppQuestions();
    }
  };

  // Handle user question selection
  const handleUserQuestionToggle = (questionId: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedUserQuestions.includes(questionId);
      const newSelection = isSelected
        ? prev.selectedUserQuestions.filter((id) => id !== questionId)
        : [...prev.selectedUserQuestions, questionId];

      return {
        ...prev,
        selectedUserQuestions: newSelection,
      };
    });
  };

  // Handle app question selection
  const handleAppQuestionToggle = (questionId: string) => {
    setSelectedAppQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
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

  const isQuestionsValid = () => {
    if (config.useUserQuestions) {
      return config.selectedUserQuestions.length === config.questionCount;
    } else {
      return selectedAppQuestions.length === config.questionCount;
    }
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
      !config.useUserQuestions &&
      !config.selectedField
    ) {
      toast({
        title: "Select Field",
        description: "Please select a field for your custom interview.",
        variant: "destructive",
      });
      return;
    }

    if (!isQuestionsValid()) {
      if (config.useUserQuestions) {
        if (config.selectedUserQuestions.length === 0) {
          toast({
            title: "Select Practice Questions",
            description:
              "Please select at least one practice question to continue.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Question Count Mismatch",
            description: `You have selected ${config.questionCount} questions but selected ${config.selectedUserQuestions.length} practice questions. Please select exactly ${config.questionCount} questions.`,
            variant: "destructive",
          });
        }
      } else {
        if (selectedAppQuestions.length === 0) {
          toast({
            title: "Select App Questions",
            description: "Please select at least one app question to continue.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Question Count Mismatch",
            description: `You have selected ${config.questionCount} questions but selected ${selectedAppQuestions.length} app questions. Please select exactly ${config.questionCount} questions.`,
            variant: "destructive",
          });
        }
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
          config: {
            ...config,
            selectedAppQuestions: selectedAppQuestions,
          },
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
          {...createMotionVariant("slideUp")}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo */}
            <motion.div {...createMotionVariant("slideDown")} className="mb-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer inline-block"
                onClick={() => navigate("/")}
              >
                <Logo variant="main" size="lg" showText={true} />
              </motion.div>
            </motion.div>

            <motion.div
              {...createMotionVariant("slideDown")}
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
              {...createMotionVariant("slideRight")}
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
                    {...createMotionVariant("slideUp")}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    {...createInteractiveState("whileHover")}
                    whileTap={createInteractiveState("whileTap")}
                  >
                    <Card
                      className={cn(
                        DESIGN_SYSTEM.card.base,
                        DESIGN_SYSTEM.card.hover,
                        DESIGN_SYSTEM.card.interactive,
                        "p-4",
                        selectedType === type.id
                          ? "ring-2 ring-primary-blue bg-primary-blue/5 shadow-professional-lg"
                          : ""
                      )}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-professional flex items-center justify-center",
                            DESIGN_SYSTEM.transitions.all,
                            DESIGN_SYSTEM.durations.normal,
                            selectedType === type.id
                              ? "bg-primary-blue text-white shadow-professional"
                              : "bg-light-gray text-muted-foreground group-hover:bg-primary-blue/10 group-hover:text-primary-blue"
                          )}
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
                                <div className="w-2 h-2 bg-primary-blue rounded-full animate-pulse"></div>
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={!config.useUserQuestions ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuestionSourceChange("app")}
                      className={cn(
                        "flex-1",
                        DESIGN_SYSTEM.transitions.all,
                        DESIGN_SYSTEM.durations.normal,
                        !config.useUserQuestions
                          ? DESIGN_SYSTEM.button.primary
                          : DESIGN_SYSTEM.button.secondary
                      )}
                    >
                      Use App Default Questions
                    </Button>
                    <Button
                      variant={config.useUserQuestions ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuestionSourceChange("user")}
                      className={cn(
                        "flex-1",
                        DESIGN_SYSTEM.transitions.all,
                        DESIGN_SYSTEM.durations.normal,
                        config.useUserQuestions
                          ? DESIGN_SYSTEM.button.primary
                          : DESIGN_SYSTEM.button.secondary
                      )}
                    >
                      Use My Practice Questions
                    </Button>
                  </div>
                </div>

                {/* App Questions Selection - Only show when interview type is selected and app questions are enabled */}
                {!config.useUserQuestions && !selectedType && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select from App Questions
                    </Label>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Please select an interview type first to view app
                        questions.
                      </p>
                    </div>
                  </div>
                )}
                {!config.useUserQuestions &&
                  selectedType === "custom" &&
                  !config.selectedField && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Select from App Questions
                      </Label>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Please select a field first to view domain-specific
                          questions.
                        </p>
                      </div>
                    </div>
                  )}
                {!config.useUserQuestions &&
                  selectedType &&
                  selectedType !== "custom" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Select from App Questions
                      </Label>
                      {loadingAppQuestions ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Loading app questions...
                          </span>
                        </div>
                      ) : appQuestions.length === 0 ? (
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            No app questions found for {selectedType}{" "}
                            interviews.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {appQuestions.map((question) => (
                              <div
                                key={question.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedAppQuestions.includes(question.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() =>
                                  handleAppQuestionToggle(question.id)
                                }
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedAppQuestions.includes(
                                      question.id
                                    )}
                                    onChange={() =>
                                      handleAppQuestionToggle(question.id)
                                    }
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {question.text}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant="outline"
                                        className={`text-xs font-medium ${getCategoryColor(
                                          question.category || selectedType
                                        )}`}
                                      >
                                        {question.category || selectedType}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {selectedAppQuestions.length} of{" "}
                            {config.questionCount} questions selected.
                            {selectedAppQuestions.length <
                              config.questionCount && (
                              <span className="text-amber-600">
                                {" "}
                                Select{" "}
                                {config.questionCount -
                                  selectedAppQuestions.length}{" "}
                                more questions.
                              </span>
                            )}
                            {selectedAppQuestions.length ===
                              config.questionCount && (
                              <span className="text-green-600 font-medium">
                                {" "}
                                ✓ Ready to start interview!
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Field Selection for Custom Interview Type */}
                {selectedType === "custom" && (
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
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              selectedField: field.id,
                              selectedUserQuestions: [], // Clear user questions too
                            }));
                            // Clear selected app questions when field changes
                            setSelectedAppQuestions([]);
                          }}
                          className={cn(
                            DESIGN_SYSTEM.transitions.all,
                            DESIGN_SYSTEM.durations.normal,
                            config.selectedField === field.id
                              ? DESIGN_SYSTEM.button.primary
                              : cn(
                                  DESIGN_SYSTEM.button.secondary,
                                  "text-gray-700 hover:text-gray-800"
                                )
                          )}
                        >
                          {field.name}
                        </Button>
                      ))}
                    </div>
                    {config.selectedField && (
                      <div className="p-3 bg-primary-blue/5 border border-primary-blue/20 rounded-professional">
                        <p className="text-xs text-primary-blue font-medium">
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

                {/* Practice Questions for Custom Interview - Only show when field is selected */}
                {config.useUserQuestions &&
                  selectedType === "custom" &&
                  config.selectedField && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Select from Your Practice Questions
                      </Label>
                      {loadingUserQuestions ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Loading your questions...
                          </span>
                        </div>
                      ) : userQuestions.length === 0 ? (
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">
                            No practice questions found for{" "}
                            {availableFields.find(
                              (f) => f.id === config.selectedField
                            )?.name || config.selectedField}{" "}
                            interviews.
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Create questions with the "
                            {availableFields.find(
                              (f) => f.id === config.selectedField
                            )?.name || config.selectedField}
                            " category in your practice questions.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate("/dashboard/practice-questions")
                            }
                          >
                            Go to Practice Questions
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {userQuestions.map((question) => (
                              <div
                                key={question.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  config.selectedUserQuestions.includes(
                                    question.id
                                  )
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() =>
                                  handleUserQuestionToggle(question.id)
                                }
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={config.selectedUserQuestions.includes(
                                      question.id
                                    )}
                                    onChange={() =>
                                      handleUserQuestionToggle(question.id)
                                    }
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {question.text}
                                    </p>
                                    {/* Only show category if it's different from selected field */}
                                    {question.category !==
                                      (availableFields.find(
                                        (f) => f.id === config.selectedField
                                      )?.name || config.selectedField) && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-medium ${getCategoryColor(
                                            question.category
                                          )}`}
                                        >
                                          {question.category}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {config.selectedUserQuestions.length} of{" "}
                            {config.questionCount} questions selected.
                            {config.selectedUserQuestions.length <
                              config.questionCount && (
                              <span className="text-amber-600">
                                {" "}
                                Select{" "}
                                {config.questionCount -
                                  config.selectedUserQuestions.length}{" "}
                                more questions.
                              </span>
                            )}
                            {config.selectedUserQuestions.length ===
                              config.questionCount && (
                              <span className="text-green-600 font-medium">
                                {" "}
                                ✓ Ready to start interview!
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* App Questions for Custom Interview - Only show when field is selected */}
                {!config.useUserQuestions &&
                  selectedType === "custom" &&
                  config.selectedField && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Select from App Questions
                      </Label>
                      {loadingAppQuestions ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Loading app questions...
                          </span>
                        </div>
                      ) : appQuestions.length === 0 ? (
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            No app questions found for {config.selectedField}{" "}
                            interviews.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {appQuestions.map((question) => (
                              <div
                                key={question.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedAppQuestions.includes(question.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() =>
                                  handleAppQuestionToggle(question.id)
                                }
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedAppQuestions.includes(
                                      question.id
                                    )}
                                    onChange={() =>
                                      handleAppQuestionToggle(question.id)
                                    }
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {question.text}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant="outline"
                                        className={`text-xs font-medium ${getCategoryColor(
                                          question.category || selectedType
                                        )}`}
                                      >
                                        {question.category || selectedType}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {selectedAppQuestions.length} of{" "}
                            {config.questionCount} questions selected.
                            {selectedAppQuestions.length <
                              config.questionCount && (
                              <span className="text-amber-600">
                                {" "}
                                Select{" "}
                                {config.questionCount -
                                  selectedAppQuestions.length}{" "}
                                more questions.
                              </span>
                            )}
                            {selectedAppQuestions.length ===
                              config.questionCount && (
                              <span className="text-green-600 font-medium">
                                {" "}
                                ✓ Ready to start interview!
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* User Questions Selection - Only show when interview type is selected */}
                {config.useUserQuestions && !selectedType && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select from Your Practice Questions
                    </Label>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Please select an interview type first to view your
                        practice questions.
                      </p>
                    </div>
                  </div>
                )}

                {/* Practice Questions for Non-Custom Interviews - Only show when interview type is selected */}
                {config.useUserQuestions &&
                  selectedType &&
                  selectedType !== "custom" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Select from Your Practice Questions
                      </Label>
                      {loadingUserQuestions ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Loading your questions...
                          </span>
                        </div>
                      ) : userQuestions.length === 0 ? (
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">
                            No practice questions found for {selectedType}{" "}
                            interviews.
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Create questions with the "{selectedType}" category
                            in your practice questions.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate("/dashboard/practice-questions")
                            }
                          >
                            Go to Practice Questions
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {userQuestions.map((question) => (
                              <div
                                key={question.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  config.selectedUserQuestions.includes(
                                    question.id
                                  )
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() =>
                                  handleUserQuestionToggle(question.id)
                                }
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={config.selectedUserQuestions.includes(
                                      question.id
                                    )}
                                    onChange={() =>
                                      handleUserQuestionToggle(question.id)
                                    }
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {question.text}
                                    </p>
                                    {/* Only show category if it's different from selected interview type */}
                                    {question.category.toLowerCase() !==
                                      selectedType && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-medium ${getCategoryColor(
                                            question.category
                                          )}`}
                                        >
                                          {question.category}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {config.selectedUserQuestions.length} of{" "}
                            {config.questionCount} questions selected.
                            {config.selectedUserQuestions.length <
                              config.questionCount && (
                              <span className="text-amber-600">
                                {" "}
                                Select{" "}
                                {config.questionCount -
                                  config.selectedUserQuestions.length}{" "}
                                more questions.
                              </span>
                            )}
                            {config.selectedUserQuestions.length ===
                              config.questionCount && (
                              <span className="text-green-600 font-medium">
                                {" "}
                                ✓ Ready to start interview!
                              </span>
                            )}
                          </div>
                        </div>
                      )}
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
                        className={cn(
                          DESIGN_SYSTEM.transitions.all,
                          DESIGN_SYSTEM.durations.normal,
                          config.duration === duration
                            ? DESIGN_SYSTEM.button.primary
                            : DESIGN_SYSTEM.button.secondary
                        )}
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
            {...createMotionVariant("slideUp")}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <motion.div
              {...createInteractiveState("whileHover")}
              whileTap={createInteractiveState("whileTap")}
              className="inline-block"
            >
              <Button
                size="lg"
                onClick={handleStartInterview}
                disabled={!selectedType || !isQuestionsValid()}
                className={cn(
                  DESIGN_SYSTEM.button.primary,
                  "px-10 py-4 h-auto rounded-professional disabled:opacity-50 disabled:cursor-not-allowed"
                )}
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
