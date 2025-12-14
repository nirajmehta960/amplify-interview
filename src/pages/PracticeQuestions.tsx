import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  userQuestionBankService,
  CustomQuestion,
} from "@/services/userQuestionBankService";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  MessageSquare,
  FileText,
  Tag,
  Clock,
  Filter,
  LayoutGrid,
  List,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Product Manager":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Technical":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Behavioral":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Leadership":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-primary/20 text-primary border-primary/30";
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading your questions...</p>
        </div>
      </div>
    );
  }

  const statsData = [
    { icon: FileText, label: "Total", value: stats.totalQuestions },
    { icon: Tag, label: "Categories", value: Object.keys(stats.byCategory).length },
    { icon: Filter, label: "Filtered", value: filteredQuestions.length },
    { icon: LayoutGrid, label: "Pages", value: totalPages },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Practice Questions - Amplify Interview</title>
        <meta name="description" content="Build your personal question bank for better interview preparation." />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">Practice Questions</h1>
                <p className="text-xs text-muted-foreground">Build your personal question bank for better interview preparation</p>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm" className="gap-2" onClick={resetForm}>
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
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statsData.map((stat, index) => (
            <div key={index} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search questions or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
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
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        {filteredQuestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No questions found matching your search.</p>
            {!searchTerm && selectedCategory === "all" && (
              <Button onClick={() => setShowAddDialog(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Question
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}
            >
              <AnimatePresence>
                {currentQuestions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.25 + index * 0.03 }}
                    className="glass-card p-4 hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                          {question.text}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge className={getCategoryColor(question.category)}>
                            {question.category}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(question.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(question)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Question</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this question? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between glass-card p-4"
              >
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredQuestions.length)} of{" "}
                  {filteredQuestions.length} questions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
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
      </main>
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
