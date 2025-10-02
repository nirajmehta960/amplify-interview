import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  Mail,
  FileText,
  FileSpreadsheet,
  Link,
  Copy,
  Check,
  Calendar,
  User,
  Target,
  TrendingUp,
  Clock,
  MessageSquare,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface ExportData {
  sessionId: string;
  overallScore: number;
  performanceBadge: string;
  duration: number;
  completionTime: string;
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    duration: number;
    fillerWords: number;
    confidence: number;
    speakingPace: number;
  }>;
  strengths: string[];
  improvements: string[];
  insights: string[];
  recommendations: string[];
}

interface ExportSharingProps {
  data: ExportData;
  onExport?: (format: string, options: ExportOptions) => void;
  onShare?: (method: string, options: ShareOptions) => void;
}

interface ExportOptions {
  includeVideo: boolean;
  includeTranscript: boolean;
  includeAnalysis: boolean;
  includeRecommendations: boolean;
}

interface ShareOptions {
  includeScore: boolean;
  includeDetails: boolean;
  message?: string;
}

const ExportSharing = ({ data, onExport, onShare }: ExportSharingProps) => {
  const { toast } = useToast();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [shareMethod, setShareMethod] = useState("link");
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeVideo: false,
    includeTranscript: true,
    includeAnalysis: true,
    includeRecommendations: true,
  });
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    includeScore: true,
    includeDetails: false,
    message: "",
  });
  const [linkCopied, setLinkCopied] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (onExport) {
        onExport(exportFormat, exportOptions);
      }

      toast({
        title: "Export Successful",
        description: `Your ${exportFormat.toUpperCase()} report has been generated and downloaded.`,
      });

      setShowExportDialog(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);

    try {
      // Simulate sharing process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (onShare) {
        onShare(shareMethod, shareOptions);
      }

      toast({
        title: "Share Successful",
        description: `Your results have been shared via ${shareMethod}.`,
      });

      setShowShareDialog(false);
    } catch (error) {
      toast({
        title: "Share Failed",
        description:
          "There was an error sharing your results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/results/${data.sessionId}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);

    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const generatePDFReport = () => {
    // In a real app, this would use a PDF generation library like jsPDF or Puppeteer
    const reportContent = `
      Interview Performance Report
      =========================
      
      Overall Score: ${data.overallScore}%
      Performance: ${data.performanceBadge}
      Duration: ${data.duration} minutes
      Completed: ${new Date(data.completionTime).toLocaleDateString()}
      
      Question Responses:
      ${data.responses
        .map(
          (response, index) => `
        ${index + 1}. ${response.question}
           Score: ${response.score}%
           Duration: ${response.duration}s
           Answer: ${response.answer}
      `
        )
        .join("\n")}
      
      Strengths:
      ${data.strengths.map((strength) => `• ${strength}`).join("\n")}
      
      Areas for Improvement:
      ${data.improvements.map((improvement) => `• ${improvement}`).join("\n")}
      
      AI Insights:
      ${data.insights.map((insight) => `• ${insight}`).join("\n")}
      
      Recommendations:
      ${data.recommendations.map((rec) => `• ${rec}`).join("\n")}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${data.sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCSVData = () => {
    const csvContent = [
      [
        "Question",
        "Answer",
        "Score",
        "Duration (s)",
        "Filler Words",
        "Confidence",
        "Speaking Pace",
      ],
      ...data.responses.map((response) => [
        response.question,
        response.answer,
        response.score,
        response.duration,
        response.fillerWords,
        response.confidence,
        response.speakingPace,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-data-${data.sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Export Options */}
      <div className="grid grid-cols-2 gap-4">
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="glass h-auto p-6">
              <div className="text-center">
                <Download className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="font-semibold">Export Report</div>
                <div className="text-sm text-muted-foreground">
                  PDF, CSV, or custom format
                </div>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Interview Report</DialogTitle>
              <DialogDescription>
                Choose the format and content for your interview report
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF Report
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV Data
                      </div>
                    </SelectItem>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        JSON Data
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Include in Report</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-transcript"
                      checked={exportOptions.includeTranscript}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeTranscript: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="include-transcript" className="text-sm">
                      Question & Answer Transcript
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-analysis"
                      checked={exportOptions.includeAnalysis}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeAnalysis: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="include-analysis" className="text-sm">
                      AI Analysis & Scores
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-recommendations"
                      checked={exportOptions.includeRecommendations}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeRecommendations: checked as boolean,
                        }))
                      }
                    />
                    <label
                      htmlFor="include-recommendations"
                      className="text-sm"
                    >
                      Recommendations
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-video"
                      checked={exportOptions.includeVideo}
                      onCheckedChange={(checked) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeVideo: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="include-video" className="text-sm">
                      Video Recording
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    exportFormat === "pdf" ? generatePDFReport : generateCSVData
                  }
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="glass h-auto p-6">
              <div className="text-center">
                <Share2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="font-semibold">Share Results</div>
                <div className="text-sm text-muted-foreground">
                  Link, email, or social media
                </div>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share Your Results</DialogTitle>
              <DialogDescription>
                Share your interview performance with others
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Share Method</label>
                <Select value={shareMethod} onValueChange={setShareMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Share Link
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Report
                      </div>
                    </SelectItem>
                    <SelectItem value="social">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Social Media
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Share Options</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-score"
                      checked={shareOptions.includeScore}
                      onCheckedChange={(checked) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          includeScore: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="include-score" className="text-sm">
                      Include Overall Score
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-details"
                      checked={shareOptions.includeDetails}
                      onCheckedChange={(checked) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          includeDetails: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="include-details" className="text-sm">
                      Include Detailed Analysis
                    </label>
                  </div>
                </div>
              </div>

              {shareMethod === "link" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/results/${data.sessionId}`}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      {linkCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex-1"
                >
                  {isSharing ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="glass"
          onClick={handleCopyLink}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="glass"
          onClick={generatePDFReport}
        >
          <FileText className="w-4 h-4 mr-2" />
          Quick PDF
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="glass"
          onClick={generateCSVData}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>
    </div>
  );
};

export default ExportSharing;
