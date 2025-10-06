import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  DollarSign,
  Clock,
  Target,
} from "lucide-react";
import {
  unifiedTranscriptionService,
  type TranscriptionProvider,
} from "@/services/unifiedTranscriptionService";

const TranscriptionProviderSelector = () => {
  const [providers, setProviders] = useState<any>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const availableProviders =
      unifiedTranscriptionService.getAvailableProviders();
    setProviders(availableProviders);
  }, []);

  const testProviders = async () => {
    setIsTesting(true);
    try {
      const results = await unifiedTranscriptionService.testProviders();
      setTestResults(results);
    } catch (error) {
      console.error("Provider testing failed:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (provider: any) => {
    if (!provider.available)
      return <XCircle className="w-4 h-4 text-red-500" />;
    if (testResults[provider.name]?.success)
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (testResults[provider.name]?.success === false)
      return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (provider: any) => {
    if (!provider.available)
      return <Badge variant="destructive">Not Available</Badge>;
    if (testResults[provider.name]?.success)
      return (
        <Badge variant="default" className="bg-green-500">
          Working
        </Badge>
      );
    if (testResults[provider.name]?.success === false)
      return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">Not Tested</Badge>;
  };

  const getCostIcon = (cost: string) => {
    if (cost.includes("Free"))
      return <DollarSign className="w-3 h-3 text-green-500" />;
    if (cost.includes("Paid"))
      return <DollarSign className="w-3 h-3 text-orange-500" />;
    return <DollarSign className="w-3 h-3 text-gray-500" />;
  };

  const getAccuracyIcon = (accuracy: string) => {
    if (accuracy === "High")
      return <Target className="w-3 h-3 text-green-500" />;
    if (accuracy === "Medium")
      return <Target className="w-3 h-3 text-yellow-500" />;
    return <Target className="w-3 h-3 text-red-500" />;
  };

  const getSpeedIcon = (speed: string) => {
    if (speed === "Fast") return <Zap className="w-3 h-3 text-green-500" />;
    if (speed === "Medium")
      return <Clock className="w-3 h-3 text-yellow-500" />;
    return <Clock className="w-3 h-3 text-red-500" />;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Transcription Providers</h2>
          <p className="text-muted-foreground">
            Choose your preferred transcription service. The app will
            automatically use the best available option.
          </p>
        </div>
        <Button onClick={testProviders} disabled={isTesting}>
          {isTesting ? "Testing..." : "Test All Providers"}
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(providers).map(([key, provider]: [string, any]) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              {getStatusIcon(provider)}
              <div>
                <h3 className="font-semibold">{provider.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {getCostIcon(provider.cost)}
                    {provider.cost}
                  </div>
                  <div className="flex items-center gap-1">
                    {getAccuracyIcon(provider.accuracy)}
                    {provider.accuracy} Accuracy
                  </div>
                  <div className="flex items-center gap-1">
                    {getSpeedIcon(provider.speed)}
                    {provider.speed}
                  </div>
                </div>
                {testResults[key]?.error && (
                  <p className="text-xs text-red-500 mt-1">
                    Error: {testResults[key].error}
                  </p>
                )}
                {testResults[key]?.duration && (
                  <p className="text-xs text-green-500 mt-1">
                    Test completed in {testResults[key].duration}ms
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(provider)}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2">How it works:</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            • The app uses Deepgram API for high-quality video transcription
          </li>
          <li>
            • Deepgram provides 45,000 minutes of free transcription per month
          </li>
          <li>• Mock data is always available as a last resort for testing</li>
          <li>
            • You can add API keys for free services in your .env.local file
          </li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2 text-blue-800">
          Free Alternatives Setup:
        </h4>
        <div className="space-y-2 text-sm text-blue-700">
          <p>
            <strong>Deepgram:</strong> Get free API key at{" "}
            <a
              href="https://deepgram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              deepgram.com
            </a>{" "}
            (45,000 minutes free per month)
          </p>
        </div>
      </div>
    </Card>
  );
};

export default TranscriptionProviderSelector;
