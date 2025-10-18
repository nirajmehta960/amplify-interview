import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  DESIGN_SYSTEM,
  cn,
  createMotionVariant,
  createInteractiveState,
} from "@/lib/design-system";
import {
  userQuestionBankService,
  CustomQuestion,
} from "@/services/userQuestionBankService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Clock,
  BarChart3,
  Filter,
  BookOpen,
  Brain,
  Target,
  Zap,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

const PracticeQuestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<CustomQuestion[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(
    null
  );
  const [stats, setStats] = useState({
    totalQuestions: 0,
    byCategory: {} as Record<string, number>,
    recentQuestions: [] as CustomQuestion[],
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(12); // Show 12 questions per page
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // Grid or list view

  // Form state
  const [formData, setFormData] = useState({
    text: "",
    category: "Behavioral",
  });

  const categories = [
    "Behavioral",
    "Technical",
    "Leadership",
    "Product Manager",
    "Software Engineer",
    "Data Scientist",
    "UI/UX Designer",
    "DevOps Engineer",
    "AI Engineer",
  ];

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

  useEffect(() => {
    if (user) {
      loadQuestions();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    filterQuestions();
    setCurrentPage(1); // Reset to first page when filters change
  }, [questions, searchTerm, selectedCategory]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = filteredQuestions.slice(startIndex, endIndex);

  const loadQuestions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userQuestions = await userQuestionBankService.getUserQuestions(
        user.id
      );
      setQuestions(userQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const questionStats = await userQuestionBankService.getQuestionBankStats(
        user.id
      );
      setStats(questionStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((q) => q.category === selectedCategory);
    }

    setFilteredQuestions(filtered);
  };

  const handleAddQuestion = async () => {
    if (!user || !formData.text.trim()) return;

    try {
      const newQuestion = await userQuestionBankService.addQuestion(user.id, {
        text: formData.text.trim(),
        category: formData.category,
      });

      if (newQuestion) {
        setQuestions((prev) => [newQuestion, ...prev]);
        setFormData({
          text: "",
          category: "Behavioral",
        });
        setShowAddDialog(false);
        loadStats();
        toast({
          title: "Success",
          description: "Question added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding question:", error);
      toast({
        title: "Error",
        description: "Failed to add question",
        variant: "destructive",
      });
    }
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || !formData.text.trim()) return;

    try {
      const updatedQuestion = await userQuestionBankService.updateQuestion(
        editingQuestion.id,
        {
          text: formData.text.trim(),
          category: formData.category,
        }
      );

      if (updatedQuestion) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? updatedQuestion : q))
        );
        setEditingQuestion(null);
        setFormData({
          text: "",
          category: "Behavioral",
        });
        loadStats();
        toast({
          title: "Success",
          description: "Question updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating question:", error);
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const success = await userQuestionBankService.deleteQuestion(questionId);
      if (success) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        loadStats();
        toast({
          title: "Success",
          description: "Question deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (question: CustomQuestion) => {
    setEditingQuestion(question);
    setFormData({
      text: question.text,
      category: question.category,
    });
  };

  const resetForm = () => {
    setFormData({
      text: "",
      category: "Behavioral",
    });
    setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Practice Questions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Build your personal question bank for better interview
                preparation
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={resetForm}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Question</DialogTitle>
                    <DialogDescription>
                      Create a custom question for your practice sessions
                    </DialogDescription>
                  </DialogHeader>
                  <QuestionForm
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    onSubmit={handleAddQuestion}
                    onCancel={() => setShowAddDialog(false)}
                    editingQuestion={null}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-lg font-bold">{stats.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-lg font-bold">
                    {Object.keys(stats.byCategory).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-lg font-bold">
                    {filteredQuestions.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Filtered</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-lg font-bold">{totalPages}</p>
                  <p className="text-xs text-muted-foreground">Pages</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Compact Filters and Controls */}
        <Card className="p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-40 h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-9 px-3"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-9 px-3"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Questions Display */}
        {filteredQuestions.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No questions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your filters"
                : "Start building your question bank by adding your first question"}
            </p>
            {!searchTerm && selectedCategory === "all" && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Question
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Questions Grid/List */}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6"
                  : "space-y-2 mb-6"
              }
            >
              <AnimatePresence>
                {currentQuestions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    {...createMotionVariant("slideUp")}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        DESIGN_SYSTEM.card.base,
                        DESIGN_SYSTEM.card.hover,
                        "group",
                        viewMode === "grid" ? "p-4" : "p-3"
                      )}
                    >
                      <div
                        className={`flex ${
                          viewMode === "grid"
                            ? "flex-col"
                            : "items-center justify-between"
                        } gap-3`}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-gray-900 ${
                              viewMode === "grid" ? "text-sm mb-2" : "text-sm"
                            }`}
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {question.text}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${getCategoryColor(
                                question.category
                              )}`}
                            >
                              {question.category}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(
                                question.created_at
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-1 ${
                            viewMode === "grid" ? "mt-3" : ""
                          }`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(question)}
                            className={cn(
                              "h-8 w-8 p-0 opacity-0 group-hover:opacity-100",
                              DESIGN_SYSTEM.transitions.opacity
                            )}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Question
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this question?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteQuestion(question.id)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredQuestions.length)} of{" "}
                  {filteredQuestions.length} questions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === currentPage;
                      return (
                        <Button
                          key={pageNum}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-8 w-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && (
                      <>
                        <span className="text-muted-foreground">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="h-8 w-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editingQuestion}
          onOpenChange={() => setEditingQuestion(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>
                Update your question details
              </DialogDescription>
            </DialogHeader>
            <QuestionForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              onSubmit={handleEditQuestion}
              onCancel={() => setEditingQuestion(null)}
              editingQuestion={editingQuestion}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Question Form Component
interface QuestionFormProps {
  formData: {
    text: string;
    category: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      text: string;
      category: string;
    }>
  >;
  categories: string[];
  onSubmit: () => void;
  onCancel: () => void;
  editingQuestion: CustomQuestion | null;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  formData,
  setFormData,
  categories,
  onSubmit,
  onCancel,
  editingQuestion,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question-text">Question Text</Label>
        <Textarea
          id="question-text"
          placeholder="Enter your question here..."
          value={formData.text}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, text: e.target.value }))
          }
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, category: value }))
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!formData.text.trim()}>
          {editingQuestion ? "Update" : "Add"} Question
        </Button>
      </div>
    </div>
  );
};

export default PracticeQuestions;
