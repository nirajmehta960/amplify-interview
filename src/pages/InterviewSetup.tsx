import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Sparkles,
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
import { useAuth } from "@/contexts/AuthContext";
import {
  getAvailableFields,
  getQuestionCountByType,
  getQuestionCountByCustomDomain,
  type Field,
} from "@/services/questionDatabaseService";
import {
  userQuestionBankService,
  CustomQuestion,
} from "@/services/userQuestionBankService";

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
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Set Up Your Interview - Amplify Interview</title>
        <meta name="description" content="Choose your interview type and customize the experience to match your goals." />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-display font-semibold text-lg text-foreground">Amplify Interview</span>
              <p className="text-xs text-muted-foreground">AI-Powered Mock Interviews</p>
            </div>
          </Link>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-5xl">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Set Up Your Interview
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4 sm:px-0">
            Choose your interview type and customize the experience to match your goals
          </p>
        </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Interview Type Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">Interview Type</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {interviewTypes.map((type) => (
                  <motion.button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`glass-card p-5 text-left transition-all duration-200 ${
                      selectedType === type.id
                        ? "border-primary/50 bg-primary/10"
                        : "hover:border-border/80"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      selectedType === type.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      <type.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground mb-1">{type.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{type.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{type.estimatedDuration}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Selected Type Details */}
              {selectedType && interviewTypes.find(t => t.id === selectedType) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20"
                >
                  <p className="text-sm text-muted-foreground">
                    {interviewTypes.find(t => t.id === selectedType)?.details}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-medium text-primary bg-primary/20 px-2.5 py-1 rounded-full">
                      {selectedType === "custom"
                        ? "Multiple domains available"
                        : `${questionCounts[selectedType as "behavioral" | "technical" | "leadership"] || 0} questions`}
                    </span>
                    <span className="text-xs text-muted-foreground">available</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Configuration Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">Configuration</h2>
              </div>

              <div className="glass-card p-6 space-y-6">
                {/* Question Source */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Question Source</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleQuestionSourceChange("app")}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        !config.useUserQuestions
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Use App Default Questions
                    </button>
                    <button
                      onClick={() => handleQuestionSourceChange("user")}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        config.useUserQuestions
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Use My Practice Questions
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Select from App Questions</label>
                  {!selectedType ? (
                    <div className="p-8 text-center rounded-lg bg-secondary/50 border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">
                        Please select an interview type first to view app questions.
                      </p>
                    </div>
                  ) : selectedType === "custom" && !config.selectedField ? (
                    <div className="p-8 text-center rounded-lg bg-secondary/50 border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">
                        Please select a field first to view domain-specific questions.
                      </p>
                    </div>
                  ) : (
                    <>
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
                                Ready to start interview!
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Custom Field Selection */}
                {selectedType === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-foreground">Select Field</label>
                    <Select
                      value={config.selectedField}
                      onValueChange={(value) => {
                        setConfig((prev) => ({
                          ...prev,
                          selectedField: value,
                          selectedUserQuestions: [],
                        }));
                        setSelectedAppQuestions([]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a field" />
                      </SelectTrigger>
                      <SelectContent className="glass-card">
                        {availableFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name} ({questionCounts.custom[field.id] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {config.selectedField && (
                      <div className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                          {questionCounts.custom[config.selectedField] || 0} questions available for{" "}
                          {availableFields.find((f) => f.id === config.selectedField)?.name}
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
                                Ready to start interview!
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
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 block">Select from App Questions</label>
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
                                Ready to start interview!
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
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {userQuestions.map((question) => (
                            <label
                              key={question.id}
                              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                config.selectedUserQuestions.includes(question.id)
                                  ? "bg-primary/10 border border-primary/30"
                                  : "bg-secondary/50 border border-transparent hover:bg-secondary"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                config.selectedUserQuestions.includes(question.id)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/50"
                              }`}>
                                {config.selectedUserQuestions.includes(question.id) && (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-foreground">{question.text}</p>
                                {question.category.toLowerCase() !== selectedType && (
                                  <span className="text-xs text-muted-foreground mt-1 inline-block px-2 py-0.5 bg-muted rounded">
                                    {question.category}
                                  </span>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={config.selectedUserQuestions.includes(question.id)}
                                onChange={() => handleUserQuestionToggle(question.id)}
                                className="sr-only"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                      {selectedType && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {config.selectedUserQuestions.length} of {config.questionCount} questions selected.{" "}
                          {config.selectedUserQuestions.length < config.questionCount && (
                            <span className="text-primary">
                              Select {config.questionCount - config.selectedUserQuestions.length} more questions.
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Duration</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {durations.map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setConfig((prev) => ({ ...prev, duration }))}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                        config.duration === duration
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {duration}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">Number of Questions</label>
                  <span className="text-sm font-medium text-primary bg-primary/20 px-2.5 py-1 rounded-lg">
                    {config.questionCount}
                  </span>
                </div>
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
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <Button
            variant="hero"
            size="xl"
            className="min-w-[240px] gap-3"
            disabled={!selectedType || !isQuestionsValid()}
            onClick={handleStartInterview}
          >
            <Play className="w-5 h-5" />
            Start Interview
          </Button>
        </motion.div>
      </main>

      {/* Pre-interview Checklist Modal */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="max-w-md glass-card">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground font-display">
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
                  className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500"
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
                  className="flex items-center gap-3 cursor-pointer hover:bg-primary/5 p-3 rounded-lg transition-all duration-300 group"
                  onClick={() => handleChecklistToggle(item.key)}
                >
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      item.checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary group-hover:bg-primary/10"
                    }`}
                  >
                    {item.checked && <Check className="w-4 h-4" />}
                  </div>
                  <span className="text-sm select-none text-foreground font-medium">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {!isAllChecklistItemsCompleted() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
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
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={handleBeginInterview}
                disabled={isStarting || !isAllChecklistItemsCompleted()}
                className="flex-1"
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
