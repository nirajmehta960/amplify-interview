import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { PageContainer, PageHeader } from "@/components/shell/PageHeader";
import { LoadError } from "@/components/dashboard/LoadError";
import { formatSessionDate } from "@/components/dashboard/format";
import { CARD } from "@/components/analytics/styles";
import { useAuth } from "@/contexts/AuthContext";
import {
  userQuestionBankService,
  CustomQuestion,
} from "@/services/userQuestionBankService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MessageSquare,
  FileText,
  Tag,
  Info,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from "lucide-react";

const PracticeQuestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<CustomQuestion[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(
    null
  );

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

  useEffect(() => {
    if (user) {
      loadQuestions();
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
        user.uid
      );
      setQuestions(userQuestions);
      setLoadError(false);
    } catch (error) {
      console.error("Error loading questions:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
  };

  const handleAddQuestion = async () => {
    if (!user || !formData.text.trim()) return;

    try {
      const newQuestion = await userQuestionBankService.addQuestion(user.uid, {
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

  // Counted from the loaded bank, so the tiles can never disagree with the list.
  const tiles = [
    { icon: FileText, label: "Questions", value: questions.length },
    { icon: Tag, label: "Categories", value: new Set(questions.map((q) => q.category)).size },
  ];

  const filtersActive = searchTerm !== "" || selectedCategory !== "all";

  return (
    <PageContainer>
      <Helmet>
        <title>Practice questions — Amplify Interview</title>
      </Helmet>

      <PageHeader
        title="Practice questions"
        subtitle="Your own bank of questions to rehearse."
        actions={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
                Add question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add a question</DialogTitle>
                <DialogDescription>Save a question you want to rehearse.</DialogDescription>
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
        }
      />

      {loadError ? (
        <LoadError className="mt-8" message="We couldn't load your questions." onRetry={loadQuestions} />
      ) : loading ? (
        <div className="mt-8 space-y-4" role="status" aria-label="Loading questions">
          <Skeleton className="h-[76px] rounded-2xl sm:max-w-md" />
          <Skeleton className="h-[72px] rounded-2xl" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <ul className="grid w-full grid-cols-2 gap-4 md:max-w-md md:shrink-0">
              {tiles.map((tile) => (
                <li key={tile.label} className={cn(CARD, "flex items-center gap-3 p-4")}>
                  <tile.icon className="size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-semibold leading-none text-foreground">{tile.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tile.label}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="flex flex-1 items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              These are for your own practice. Interviews are generated from your résumé and the job description.
            </p>
          </div>

          {questions.length === 0 ? (
            <div className={cn(CARD, "px-6 py-12 text-center")}>
              <MessageSquare className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">No questions yet</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Save the questions you expect to be asked, then rehearse them out loud.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="mt-5">
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
                Add your first question
              </Button>
            </div>
          ) : (
            <>
              <div className={cn(CARD, "p-4")}>
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="search"
                      aria-label="Search questions"
                      placeholder="Search questions or categories…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger aria-label="Filter by category" className="w-full md:w-52">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 self-start rounded-lg bg-secondary p-1 md:self-auto">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      className="size-8"
                      aria-label="List view"
                      aria-pressed={viewMode === "list"}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      className="size-8"
                      aria-label="Grid view"
                      aria-pressed={viewMode === "grid"}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>

              {filteredQuestions.length === 0 ? (
                <div className={cn(CARD, "px-6 py-10 text-center")}>
                  <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <h2 className="mt-3 text-base font-semibold text-foreground">No questions match</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Try another word or category.</p>
                  {filtersActive ? (
                    <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <ul className={viewMode === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "space-y-3"}>
                    {currentQuestions.map((question) => (
                      <li key={question.id} className={cn(CARD, "p-5")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{question.text}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-foreground">
                                {question.category}
                              </span>
                              <time dateTime={question.created_at} className="text-xs text-muted-foreground">
                                Added {formatSessionDate(question.created_at)}
                              </time>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit question"
                              onClick={() => openEditDialog(question)}
                              className="size-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete question"
                                  className="size-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    It will be removed from your bank. This can't be undone.
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
                      </li>
                    ))}
                  </ul>

                  {totalPages > 1 && (
                    <nav
                      aria-label="Pages"
                      className={cn(CARD, "flex flex-wrap items-center justify-between gap-3 p-4")}
                    >
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}–{Math.min(endIndex, filteredQuestions.length)} of{" "}
                        {filteredQuestions.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Previous page"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="size-8"
                        >
                          <ChevronLeft className="size-4" aria-hidden="true" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            const isActive = pageNum === currentPage;
                            return (
                              <Button
                                key={pageNum}
                                variant={isActive ? "default" : "outline"}
                                size="icon"
                                aria-current={isActive ? "page" : undefined}
                                onClick={() => setCurrentPage(pageNum)}
                                className="size-8"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          {totalPages > 5 && (
                            <>
                              <span className="text-muted-foreground" aria-hidden="true">…</span>
                              <Button
                                variant="outline"
                                size="icon"
                                aria-current={currentPage === totalPages ? "page" : undefined}
                                onClick={() => setCurrentPage(totalPages)}
                                className="size-8"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Next page"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="size-8"
                        >
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
            <DialogDescription>Change the wording or the category.</DialogDescription>
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
    </PageContainer>
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
        <Label htmlFor="question-text">Question</Label>
        <Textarea
          id="question-text"
          placeholder="e.g. Tell me about a time you disagreed with your manager."
          value={formData.text}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, text: e.target.value }))
          }
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="question-category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, category: value }))
          }
        >
          <SelectTrigger id="question-category" className="mt-1">
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
          {editingQuestion ? "Save changes" : "Add question"}
        </Button>
      </div>
    </div>
  );
};

export default PracticeQuestions;
