import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const EnvironmentTest = () => {
  const [testResults, setTestResults] = useState<{
    openai: boolean | null;
    supabase: boolean | null;
    video: boolean | null;
    quota: boolean | null;
  }>({
    openai: null,
    supabase: null,
    video: null,
    quota: null,
  });

  const testEnvironment = async () => {
    const results = {
      deepgram: !!import.meta.env.VITE_DEEPGRAM_API_KEY,
      supabase: !!(
        import.meta.env.VITE_SUPABASE_URL &&
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ),
      video:
        "MediaRecorder" in window && "getUserMedia" in navigator.mediaDevices,
      quota: null as boolean | null,
    };

    // Test Deepgram quota if API key is available
    if (results.deepgram) {
      try {
        const testBlob = new Blob(["test"], { type: "audio/webm" });

        const response = await fetch(
          "https://api.deepgram.com/v1/listen?model=nova-2&language=en",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
              "Content-Type": "audio/webm",
            },
            body: testBlob,
          }
        );

        if (response.status === 429) {
          results.quota = false; // Quota exceeded
        } else if (response.ok) {
          results.quota = true; // Quota available
        } else {
          results.quota = false; // Other error
        }
      } catch (error) {
        console.error("Quota test error:", error);
        results.quota = false;
      }
    }

    setTestResults(results);
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null)
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean | null) => {
    if (status === null) return <Badge variant="secondary">Not Tested</Badge>;
    return status ? (
      <Badge variant="default" className="bg-green-500">
        Working
      </Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Environment Test</h2>
      <p className="text-muted-foreground mb-6">
        Test your environment configuration to ensure everything is working
        properly.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(testResults.deepgram)}
            <div>
              <h3 className="font-semibold">Deepgram API Key</h3>
              <p className="text-sm text-muted-foreground">
                Required for video transcription
              </p>
            </div>
          </div>
          {getStatusBadge(testResults.deepgram)}
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(testResults.supabase)}
            <div>
              <h3 className="font-semibold">Supabase Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Required for database and authentication
              </p>
            </div>
          </div>
          {getStatusBadge(testResults.supabase)}
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(testResults.video)}
            <div>
              <h3 className="font-semibold">Video Recording</h3>
              <p className="text-sm text-muted-foreground">
                Browser support for video recording
              </p>
            </div>
          </div>
          {getStatusBadge(testResults.video)}
        </div>

        {testResults.deepgram && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(testResults.quota)}
              <div>
                <h3 className="font-semibold">Deepgram Quota</h3>
                <p className="text-sm text-muted-foreground">
                  Available API credits for transcription
                </p>
              </div>
            </div>
            {getStatusBadge(testResults.quota)}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={testEnvironment} className="flex-1">
          Run Environment Test
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open("/ENVIRONMENT_SETUP.md", "_blank")}
        >
          Setup Guide
        </Button>
      </div>

      {testResults.deepgram !== null && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Test Results:</h4>
          <ul className="space-y-1 text-sm">
            <li>
              Deepgram API:{" "}
              {testResults.deepgram
                ? "✅ Configured"
                : "❌ Missing - Add VITE_DEEPGRAM_API_KEY to .env.local"}
            </li>
            <li>
              Supabase:{" "}
              {testResults.supabase
                ? "✅ Configured"
                : "❌ Missing - Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local"}
            </li>
            <li>
              Video Recording:{" "}
              {testResults.video
                ? "✅ Supported"
                : "❌ Not supported in this browser"}
            </li>
            {testResults.openai && (
              <li>
                OpenAI Quota:{" "}
                {testResults.quota === null
                  ? "⏳ Testing..."
                  : testResults.quota
                  ? "✅ Available"
                  : "❌ Exceeded - Check billing at https://platform.openai.com/usage"}
              </li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default EnvironmentTest;
