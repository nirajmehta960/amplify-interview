import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { userQuestionBankService, CustomQuestion } from "@/services/userQuestionBankService";
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
} from "lucide-react";

const PracticeQuestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    byCategory: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
    recentQuestions: [] as CustomQuestion[],
  });

  // Form state
  const [formData, setFormData] = useState({
    text: "",
    category: "General",
    difficulty: "medium" as "easy" | "medium" | "hard",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");

  const categories = [
    "General",
    "Behavioral",
    "Technical",
    "Leadership",
    "Product Management",
    "Software Engineering",
    "Data Science",
    "UI/UX Design",
    "DevOps",
    "AI/ML",
  ];

  const difficulties = [
    { value: "easy", label: "Easy", color: "bg-green-100 text-green-800" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
    { value: "hard", label: "Hard", color: "bg-red-100 text-red-800" },
  ];

  useEffect(() => {
    if (user) {
      loadQuestions();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, selectedCategory, selectedDifficulty]);

  const loadQuestions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userQuestions = await userQuestionBankService.getUserQuestions(user.id);
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
      const questionStats = await userQuestionBankService.getQuestionBankStats(user.id);
      setStats(questionStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    setFilteredQuestions(filtered);
  };

  const handleAddQuestion = async () => {
    if (!user || !formData.text.trim()) return;

    try {
      const newQuestion = await userQuestionBankService.addQuestion(user.id, {
        text: formData.text.trim(),
        category: formData.category,
        difficulty: formData.difficulty,
        tags: formData.tags,
      });

      if (newQuestion) {
        setQuestions(prev => [newQuestion, ...prev]);
        setFormData({ text: "", category: "General", difficulty: "medium", tags: [] });
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
      const updatedQuestion = await userQuestionBankService.updateQuestion(editingQuestion.id, {
        text: formData.text.trim(),
        category: formData.category,
        difficulty: formData.difficulty,
        tags: formData.tags,
      });

      if (updatedQuestion) {
        setQuestions(prev =>
          prev.map(q => q.id === editingQuestion.id ? updatedQuestion : q)
        );
        setEditingQuestion(null);
        setFormData({ text: "", category: "General", difficulty: "medium", tags: [] });
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
        setQuestions(prev => prev.filter(q => q.id !== questionId));
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
      difficulty: question.difficulty,
      tags: question.tags,
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const resetForm = () => {
    setFormData({ text: "", category: "General", difficulty: "medium", tags: [] });
    setEditingQuestion(null);
    setNewTag("");
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-primary" />
                Practice Questions
              </h1>
              <p className="text-muted-foreground mt-2">
                Build your personal question bank for better interview preparation
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="flex items-center gap-2">
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
                  newTag={newTag}
                  setNewTag={setNewTag}
                  addTag={addTag}
                  removeTag={removeTag}
                  categories={categories}
                  difficulties={difficulties}
                  onSubmit={handleAddQuestion}
                  onCancel={() => setShowAddDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.byDifficulty.hard || 0}</p>
                  <p className="text-sm text-muted-foreground">Hard Questions</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.byDifficulty.easy || 0}</p>
                  <p className="text-sm text-muted-foreground">Easy Questions</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {difficulties.map(diff => (
                  <SelectItem key={diff.value} value={diff.value}>
                    {diff.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <p className="text-lg font-medium mb-2">{question.text}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{question.category}</Badge>
                        <Badge className={difficulties.find(d => d.value === question.difficulty)?.color}>
                          {question.difficulty}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(question.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(question)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
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
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredQuestions.length === 0 && (
            <Card className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "all" || selectedDifficulty !== "all"
                  ? "Try adjusting your filters"
                  : "Start building your question bank by adding your first question"
                }
              </p>
              {!searchTerm && selectedCategory === "all" && selectedDifficulty === "all" && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Question
                </Button>
              )}
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
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
              newTag={newTag}
              setNewTag={setNewTag}
              addTag={addTag}
              removeTag={removeTag}
              categories={categories}
              difficulties={difficulties}
              onSubmit={handleEditQuestion}
              onCancel={() => setEditingQuestion(null)}
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
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    text: string;
    category: string;
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
  }>>;
  newTag: string;
  setNewTag: React.Dispatch<React.SetStateAction<string>>;
  addTag: () => void;
  removeTag: (tag: string) => void;
  categories: string[];
  difficulties: { value: string; label: string; color: string }[];
  onSubmit: () => void;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  formData,
  setFormData,
  newTag,
  setNewTag,
  addTag,
  removeTag,
  categories,
  difficulties,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question-text">Question Text</Label>
        <Textarea
          id="question-text"
          placeholder="Enter your question here..."
          value={formData.text}
          onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
          className="mt-1"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value: "easy" | "medium" | "hard") => 
              setFormData(prev => ({ ...prev, difficulty: value }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map(diff => (
                <SelectItem key={diff.value} value={diff.value}>
                  {diff.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="tags"
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTag()}
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
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
