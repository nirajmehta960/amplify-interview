interface InterviewResponse {
  question: string;
  answer: string;
  duration: number;
  transcript: string;
  speakingRate: number;
  fillerWords: string[];
}

interface AIFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  insights: string[];
  recommendations: string[];
  questionAnalysis: QuestionAnalysis[];
}

interface QuestionAnalysis {
  questionId: string;
  score: number;
  strengths: string[];
  improvements: string[];
  keywords: string[];
  sentiment: "positive" | "neutral" | "negative";
}

class AIFeedbackService {
  private apiKey: string;
  private baseUrl: string = "https://api.openai.com/v1/chat/completions";

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
  }

  /**
   * Generate comprehensive AI feedback for interview responses
   */
  async generateFeedback(responses: InterviewResponse[]): Promise<AIFeedback> {
    if (!this.apiKey) {
      // Return mock feedback if API key not configured
      return this.getMockFeedback(responses);
    }

    try {
      const prompt = this.buildFeedbackPrompt(responses);

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert interview coach and HR professional with 15+ years of experience. 
              Analyze interview responses and provide constructive feedback focusing on:
              - Communication skills and clarity
              - Use of specific examples and the STAR method
              - Technical knowledge demonstration
              - Confidence and professionalism
              - Areas for improvement
              
              Provide actionable, specific feedback that will help the candidate improve their interview performance.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.parseAIResponse(result.choices[0].message.content, responses);
    } catch (error) {
      console.error("AI feedback generation error:", error);
      return this.getMockFeedback(responses);
    }
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private buildFeedbackPrompt(responses: InterviewResponse[]): string {
    let prompt = `Please analyze the following interview responses and provide comprehensive feedback:\n\n`;

    responses.forEach((response, index) => {
      prompt += `Question ${index + 1}: ${response.question}\n`;
      prompt += `Answer: ${response.answer}\n`;
      prompt += `Duration: ${response.duration} seconds\n`;
      prompt += `Speaking Rate: ${response.speakingRate} words per minute\n`;
      prompt += `Filler Words: ${response.fillerWords.join(", ")}\n\n`;
    });

    prompt += `Please provide feedback in the following JSON format:
    {
      "overallScore": number (0-100),
      "strengths": ["strength1", "strength2", ...],
      "improvements": ["improvement1", "improvement2", ...],
      "insights": ["insight1", "insight2", ...],
      "recommendations": ["recommendation1", "recommendation2", ...],
      "questionAnalysis": [
        {
          "questionId": "1",
          "score": number (0-100),
          "strengths": ["strength1"],
          "improvements": ["improvement1"],
          "keywords": ["keyword1", "keyword2"],
          "sentiment": "positive|neutral|negative"
        }
      ]
    }`;

    return prompt;
  }

  /**
   * Parse AI response and structure it properly
   */
  private parseAIResponse(
    aiResponse: string,
    responses: InterviewResponse[]
  ): AIFeedback {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallScore: parsed.overallScore || 75,
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          insights: parsed.insights || [],
          recommendations: parsed.recommendations || [],
          questionAnalysis: parsed.questionAnalysis || [],
        };
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
    }

    // Fallback to mock feedback
    return this.getMockFeedback(responses);
  }

  /**
   * Generate mock feedback when AI service is unavailable
   */
  private getMockFeedback(responses: InterviewResponse[]): AIFeedback {
    const avgSpeakingRate =
      responses.reduce((sum, r) => sum + r.speakingRate, 0) / responses.length;
    const totalFillerWords = responses.reduce(
      (sum, r) => sum + r.fillerWords.length,
      0
    );

    let overallScore = 75;
    const strengths: string[] = [];
    const improvements: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Analyze speaking rate
    if (avgSpeakingRate >= 140 && avgSpeakingRate <= 180) {
      strengths.push("Good speaking pace - clear and confident delivery");
      overallScore += 5;
    } else if (avgSpeakingRate < 120) {
      improvements.push(
        "Speaking pace is too slow - practice speaking more quickly"
      );
      overallScore -= 5;
    } else if (avgSpeakingRate > 200) {
      improvements.push("Speaking pace is too fast - slow down for clarity");
      overallScore -= 5;
    }

    // Analyze filler words
    if (totalFillerWords < 5) {
      strengths.push("Minimal use of filler words - clear communication");
      overallScore += 5;
    } else if (totalFillerWords > 15) {
      improvements.push(
        "Reduce filler words (um, uh, like) for more professional delivery"
      );
      overallScore -= 10;
    }

    // Analyze answer length
    const avgAnswerLength =
      responses.reduce((sum, r) => sum + r.answer.length, 0) / responses.length;
    if (avgAnswerLength > 200) {
      strengths.push("Detailed responses with comprehensive information");
      overallScore += 5;
    } else if (avgAnswerLength < 100) {
      improvements.push("Provide more detailed examples in your responses");
      overallScore -= 5;
    }

    // Generate insights
    insights.push(
      "You demonstrated good communication skills throughout the interview"
    );
    insights.push(
      "Consider using the STAR method (Situation, Task, Action, Result) for behavioral questions"
    );

    if (totalFillerWords > 10) {
      insights.push(
        "Your use of filler words suggests some nervousness - practice can help reduce this"
      );
    }

    // Generate recommendations
    recommendations.push(
      "Practice common interview questions using the STAR method"
    );
    recommendations.push(
      "Record yourself answering questions to improve speaking pace"
    );

    if (totalFillerWords > 5) {
      recommendations.push(
        "Work on reducing filler words through deliberate practice"
      );
    }

    recommendations.push(
      "Prepare specific examples for common behavioral questions"
    );
    recommendations.push("Practice mock interviews to build confidence");

    // Generate question analysis
    const questionAnalysis: QuestionAnalysis[] = responses.map(
      (response, index) => {
        let score = 70;
        const questionStrengths: string[] = [];
        const questionImprovements: string[] = [];

        // Analyze answer quality
        if (response.answer.length > 150) {
          questionStrengths.push("Detailed and comprehensive answer");
          score += 10;
        } else {
          questionImprovements.push("Provide more specific examples");
          score -= 5;
        }

        // Analyze filler words per question
        if (response.fillerWords.length < 2) {
          questionStrengths.push("Clear communication with minimal fillers");
          score += 5;
        } else {
          questionImprovements.push("Reduce filler words for better flow");
          score -= 5;
        }

        // Extract keywords (simple implementation)
        const keywords = this.extractKeywords(response.answer);

        // Determine sentiment
        let sentiment: "positive" | "neutral" | "negative" = "neutral";
        if (
          response.answer.toLowerCase().includes("success") ||
          response.answer.toLowerCase().includes("achieved") ||
          response.answer.toLowerCase().includes("improved")
        ) {
          sentiment = "positive";
        }

        return {
          questionId: (index + 1).toString(),
          score: Math.max(0, Math.min(100, score)),
          strengths: questionStrengths,
          improvements: questionImprovements,
          keywords,
          sentiment,
        };
      }
    );

    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      strengths,
      improvements,
      insights,
      recommendations,
      questionAnalysis,
    };
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
    ];

    const wordFreq: { [key: string]: number } = {};
    words.forEach((word) => {
      if (word.length > 3 && !stopWords.includes(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Generate real-time feedback for ongoing interview
   */
  async generateRealtimeFeedback(transcript: string): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    // Simple real-time analysis
    const wordCount = transcript.split(" ").length;
    const fillerWords = ["um", "uh", "like", "you know"];
    const fillerCount = fillerWords.reduce((count, filler) => {
      return count + (transcript.toLowerCase().split(filler).length - 1);
    }, 0);

    let score = 70;
    const suggestions: string[] = [];

    if (wordCount > 50) {
      score += 10;
    }

    if (fillerCount > 3) {
      score -= 15;
      suggestions.push('Try to reduce filler words like "um" and "uh"');
    }

    if (wordCount < 20) {
      suggestions.push("Provide more detailed examples in your response");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      feedback:
        fillerCount > 3
          ? "Consider reducing filler words"
          : "Good communication flow",
      suggestions,
    };
  }
}

export const aiFeedbackService = new AIFeedbackService();
export default aiFeedbackService;
