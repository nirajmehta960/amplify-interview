/**
 * Question Classification Service
 * Automatically classifies custom questions to determine the best analysis approach
 */

import { openRouterService } from "./openRouterService";

export interface QuestionClassification {
  type: "behavioral" | "technical" | "leadership" | "general";
  domain?: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  analysisApproach: "star" | "technical" | "leadership" | "general";
  keywords: string[];
  expectedSkills: string[];
  userIntent?: "predefined" | "ai_classified" | "role_based";
  confidence?: number; // Confidence score for AI classification
}

export interface ClassifiedQuestion {
  id: string;
  text: string;
  classification: QuestionClassification;
  originalIndex: number;
}

class QuestionClassificationService {
  /**
   * Smart classification that handles all custom question scenarios
   */
  public async classifyQuestionsSmart(
    questions: string[],
    context: {
      interviewType: "behavioral" | "technical" | "leadership" | "custom";
      selectedRole?: string;
      useCustomQuestions: boolean;
    }
  ): Promise<ClassifiedQuestion[]> {
    // Scenario 1: Pre-selected interview type - respect user's choice
    if (context.interviewType !== "custom" && context.useCustomQuestions) {
      return this.classifyByPredefinedType(questions, context.interviewType);
    }

    // Scenario 2: Custom interview type with role selection
    if (
      context.interviewType === "custom" &&
      context.selectedRole &&
      !context.useCustomQuestions
    ) {
      return this.classifyByRole(questions, context.selectedRole);
    }

    // Scenario 3 & 4: Custom interview type with custom questions - AI classification
    if (context.interviewType === "custom" && context.useCustomQuestions) {
      return this.classifyWithAI(questions);
    }

    // Fallback: treat as general
    return this.classifyAsGeneral(questions);
  }

  /**
   * Classify questions based on predefined interview type (Scenario 1)
   */
  private classifyByPredefinedType(
    questions: string[],
    interviewType: "behavioral" | "technical" | "leadership"
  ): ClassifiedQuestion[] {
    return questions.map((question, index) => ({
      id: `custom-${index + 1}`,
      text: question,
      classification: this.getClassificationForType(interviewType),
      originalIndex: index,
    }));
  }

  /**
   * Classify questions based on selected role (Scenario 2)
   */
  private classifyByRole(
    questions: string[],
    selectedRole: string
  ): ClassifiedQuestion[] {
    const roleMapping = this.getRoleMapping(selectedRole);

    return questions.map((question, index) => ({
      id: `custom-${index + 1}`,
      text: question,
      classification: {
        ...roleMapping,
        userIntent: "role_based" as const,
        confidence: 1.0,
      },
      originalIndex: index,
    }));
  }

  /**
   * Classify questions using AI analysis (Scenario 3 & 4)
   */
  private async classifyWithAI(
    questions: string[]
  ): Promise<ClassifiedQuestion[]> {
    const classifications = await Promise.all(
      questions.map((question, index) => this.classifyQuestion(question, index))
    );

    // Add confidence scores and user intent
    return classifications.map((q) => ({
      ...q,
      classification: {
        ...q.classification,
        userIntent: "ai_classified" as const,
        confidence: q.classification.confidence || 0.8,
      },
    }));
  }

  /**
   * Classify questions as general (fallback)
   */
  private classifyAsGeneral(questions: string[]): ClassifiedQuestion[] {
    return questions.map((question, index) => ({
      id: `custom-${index + 1}`,
      text: question,
      classification: {
        ...this.getDefaultClassification(),
        userIntent: "predefined" as const,
        confidence: 1.0,
      },
      originalIndex: index,
    }));
  }

  /**
   * Get classification for predefined interview type
   */
  private getClassificationForType(
    type: "behavioral" | "technical" | "leadership"
  ): QuestionClassification {
    const typeMappings = {
      behavioral: {
        type: "behavioral" as const,
        difficulty: "medium" as const,
        category: "Behavioral",
        analysisApproach: "star" as const,
        keywords: [
          "experience",
          "situation",
          "challenge",
          "team",
          "leadership",
        ],
        expectedSkills: [
          "communication",
          "problem-solving",
          "leadership",
          "teamwork",
        ],
        userIntent: "predefined" as const,
        confidence: 1.0,
      },
      technical: {
        type: "technical" as const,
        difficulty: "medium" as const,
        category: "Technical",
        analysisApproach: "technical" as const,
        keywords: ["code", "algorithm", "system", "design", "implementation"],
        expectedSkills: [
          "programming",
          "problem-solving",
          "system design",
          "debugging",
        ],
        userIntent: "predefined" as const,
        confidence: 1.0,
      },
      leadership: {
        type: "leadership" as const,
        difficulty: "medium" as const,
        category: "Leadership",
        analysisApproach: "leadership" as const,
        keywords: ["lead", "manage", "team", "strategy", "decision"],
        expectedSkills: [
          "leadership",
          "management",
          "strategy",
          "communication",
        ],
        userIntent: "predefined" as const,
        confidence: 1.0,
      },
    };

    return typeMappings[type];
  }

  /**
   * Get role-based classification mapping
   */
  private getRoleMapping(selectedRole: string): QuestionClassification {
    const roleMappings: Record<string, QuestionClassification> = {
      product_manager: {
        type: "technical",
        domain: "product_management",
        difficulty: "medium",
        category: "Product Management",
        analysisApproach: "technical",
        keywords: ["product", "strategy", "user", "market", "roadmap"],
        expectedSkills: [
          "product strategy",
          "user research",
          "market analysis",
          "roadmap planning",
        ],
        userIntent: "role_based",
        confidence: 1.0,
      },
      software_engineer: {
        type: "technical",
        domain: "software_engineering",
        difficulty: "medium",
        category: "Software Engineering",
        analysisApproach: "technical",
        keywords: [
          "code",
          "algorithm",
          "system",
          "architecture",
          "development",
        ],
        expectedSkills: [
          "programming",
          "system design",
          "algorithms",
          "debugging",
        ],
        userIntent: "role_based",
        confidence: 1.0,
      },
      data_scientist: {
        type: "technical",
        domain: "data_science",
        difficulty: "medium",
        category: "Data Science",
        analysisApproach: "technical",
        keywords: [
          "data",
          "analysis",
          "model",
          "statistics",
          "machine learning",
        ],
        expectedSkills: [
          "data analysis",
          "statistics",
          "machine learning",
          "visualization",
        ],
        userIntent: "role_based",
        confidence: 1.0,
      },
      ui_ux_designer: {
        type: "technical",
        domain: "ui_ux_design",
        difficulty: "medium",
        category: "UI/UX Design",
        analysisApproach: "technical",
        keywords: ["design", "user", "interface", "experience", "usability"],
        expectedSkills: [
          "user research",
          "prototyping",
          "visual design",
          "usability testing",
        ],
        userIntent: "role_based",
        confidence: 1.0,
      },
      devops_engineer: {
        type: "technical",
        domain: "devops",
        difficulty: "medium",
        category: "DevOps",
        analysisApproach: "technical",
        keywords: [
          "deployment",
          "infrastructure",
          "automation",
          "monitoring",
          "scalability",
        ],
        expectedSkills: [
          "infrastructure",
          "automation",
          "monitoring",
          "scalability",
        ],
        userIntent: "role_based",
        confidence: 1.0,
      },
      ai_engineer: {
        type: "technical",
        domain: "ai_engineering",
        difficulty: "medium",
        category: "AI Engineering",
        analysisApproach: "technical",
        keywords: [
          "ai",
          "machine learning",
          "model",
          "algorithm",
          "neural network",
        ],
        expectedSkills: [
          "machine learning",
          "deep learning",
          "AI systems",
          "model deployment",
        ],
        userIntent: "role_based",
        confidence: 1.0,
      },
    };

    return roleMappings[selectedRole] || this.getDefaultClassification();
  }

  /**
   * Classify a single custom question (legacy method for AI classification)
   */
  public async classifyQuestion(
    question: string,
    index: number
  ): Promise<ClassifiedQuestion> {
    try {
      const classification = await this.analyzeQuestionType(question);

      return {
        id: `custom-${index + 1}`,
        text: question,
        classification: {
          ...classification,
          userIntent: "ai_classified" as const,
          confidence: 0.8,
        },
        originalIndex: index,
      };
    } catch (error) {
      console.error("Error classifying question:", error);
      // Return default classification
      return {
        id: `custom-${index + 1}`,
        text: question,
        classification: {
          ...this.getDefaultClassification(),
          userIntent: "ai_classified" as const,
          confidence: 0.5,
        },
        originalIndex: index,
      };
    }
  }

  /**
   * Classify multiple custom questions
   */
  public async classifyQuestions(
    questions: string[]
  ): Promise<ClassifiedQuestion[]> {
    const classifications = await Promise.all(
      questions.map((question, index) => this.classifyQuestion(question, index))
    );

    return classifications;
  }

  /**
   * Analyze question type using AI
   */
  private async analyzeQuestionType(
    question: string
  ): Promise<QuestionClassification> {
    const prompt = `
Analyze this interview question and classify it. Return a JSON response with the following structure:

{
  "type": "behavioral" | "technical" | "leadership" | "general",
  "domain": "optional domain if technical (e.g., 'software_engineering', 'data_science', 'product_management')",
  "difficulty": "easy" | "medium" | "hard",
  "category": "specific category within the type",
  "analysisApproach": "star" | "technical" | "leadership" | "general",
  "keywords": ["array", "of", "key", "terms"],
  "expectedSkills": ["array", "of", "expected", "skills"]
}

Question: "${question}"

Classification guidelines:
- BEHAVIORAL: Questions about past experiences, situations, challenges, teamwork, conflict resolution, failures, successes
- TECHNICAL: Questions about specific technologies, coding, algorithms, system design, technical knowledge
- LEADERSHIP: Questions about managing teams, decision-making, vision, strategy, influence, mentoring
- GENERAL: Questions that don't fit the above categories

For technical questions, identify the domain (software_engineering, data_science, product_management, etc.)
For difficulty, consider the complexity and depth required
For analysis approach, choose the most appropriate evaluation method
`;

    try {
      const response = await openRouterService.callOpenRouterWithRetry({
        model: "anthropic/claude-3-haiku",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const classification = JSON.parse(response.choices[0].message.content);

      // Validate and sanitize the response
      return this.validateClassification(classification);
    } catch (error) {
      console.error("Error in AI classification:", error);
      return this.getDefaultClassification();
    }
  }

  /**
   * Validate and sanitize classification response
   */
  private validateClassification(classification: any): QuestionClassification {
    return {
      type: this.validateType(classification.type),
      domain: classification.domain || undefined,
      difficulty: this.validateDifficulty(classification.difficulty),
      category: classification.category || "General",
      analysisApproach: this.validateAnalysisApproach(
        classification.analysisApproach
      ),
      keywords: Array.isArray(classification.keywords)
        ? classification.keywords
        : [],
      expectedSkills: Array.isArray(classification.expectedSkills)
        ? classification.expectedSkills
        : [],
    };
  }

  private validateType(
    type: any
  ): "behavioral" | "technical" | "leadership" | "general" {
    const validTypes = ["behavioral", "technical", "leadership", "general"];
    return validTypes.includes(type) ? type : "general";
  }

  private validateDifficulty(difficulty: any): "easy" | "medium" | "hard" {
    const validDifficulties = ["easy", "medium", "hard"];
    return validDifficulties.includes(difficulty) ? difficulty : "medium";
  }

  private validateAnalysisApproach(
    approach: any
  ): "star" | "technical" | "leadership" | "general" {
    const validApproaches = ["star", "technical", "leadership", "general"];
    return validApproaches.includes(approach) ? approach : "general";
  }

  /**
   * Get default classification for fallback
   */
  private getDefaultClassification(): QuestionClassification {
    return {
      type: "general",
      domain: undefined,
      difficulty: "medium",
      category: "General",
      analysisApproach: "general",
      keywords: [],
      expectedSkills: [],
    };
  }

  /**
   * Analyze mixed domain questions intelligently
   */
  public analyzeMixedDomainQuestions(
    classifiedQuestions: ClassifiedQuestion[]
  ): {
    domainDistribution: Record<string, number>;
    primaryDomain: string;
    analysisStrategy: "unified" | "domain_specific" | "mixed";
    recommendations: string[];
  } {
    const domainCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    classifiedQuestions.forEach((q) => {
      const domain = q.classification.domain || q.classification.type;
      const type = q.classification.type;

      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const primaryDomain = Object.entries(domainCounts).reduce((a, b) =>
      domainCounts[a[0]] > domainCounts[b[0]] ? a : b
    )[0];

    const totalQuestions = classifiedQuestions.length;
    const primaryDomainCount = domainCounts[primaryDomain];
    const primaryDomainPercentage = (primaryDomainCount / totalQuestions) * 100;

    let analysisStrategy: "unified" | "domain_specific" | "mixed";
    let recommendations: string[] = [];

    if (primaryDomainPercentage >= 80) {
      analysisStrategy = "domain_specific";
      recommendations.push(`Focus on ${primaryDomain} domain analysis`);
      recommendations.push("Use domain-specific scoring criteria");
    } else if (primaryDomainPercentage >= 60) {
      analysisStrategy = "unified";
      recommendations.push(
        `Primary focus on ${primaryDomain} with general analysis`
      );
      recommendations.push("Apply unified scoring with domain weighting");
    } else {
      analysisStrategy = "mixed";
      recommendations.push("Apply mixed-domain analysis approach");
      recommendations.push(
        "Use flexible scoring criteria for each question type"
      );
      recommendations.push(
        "Provide domain-specific feedback for each response"
      );
    }

    return {
      domainDistribution: domainCounts,
      primaryDomain,
      analysisStrategy,
      recommendations,
    };
  }

  /**
   * Get analysis prompt based on classification
   */
  public getAnalysisPrompt(classification: QuestionClassification): string {
    switch (classification.analysisApproach) {
      case "star":
        return this.getBehavioralAnalysisPrompt(classification);
      case "technical":
        return this.getTechnicalAnalysisPrompt(classification);
      case "leadership":
        return this.getLeadershipAnalysisPrompt(classification);
      default:
        return this.getGeneralAnalysisPrompt(classification);
    }
  }

  private getBehavioralAnalysisPrompt(
    classification: QuestionClassification
  ): string {
    return `
You are analyzing a BEHAVIORAL interview response. Focus on the STAR method (Situation, Task, Action, Result).

Question Type: ${classification.type}
Category: ${classification.category}
Expected Skills: ${classification.expectedSkills.join(", ")}

Evaluate the response for:
1. STAR Method implementation (40 points)
2. Communication quality (30 points)  
3. Content relevance and depth (30 points)

Look for personal ownership, quantified results, and clear cause-and-effect relationships.
`;
  }

  private getTechnicalAnalysisPrompt(
    classification: QuestionClassification
  ): string {
    return `
You are analyzing a TECHNICAL interview response.

Question Type: ${classification.type}
Domain: ${classification.domain || "General"}
Category: ${classification.category}
Expected Skills: ${classification.expectedSkills.join(", ")}
Keywords: ${classification.keywords.join(", ")}

Evaluate the response for:
1. Technical accuracy and understanding (40 points)
2. Problem-solving approach (30 points)
3. Communication clarity (30 points)

Look for correct technical concepts, logical problem-solving, and clear explanations.
`;
  }

  private getLeadershipAnalysisPrompt(
    classification: QuestionClassification
  ): string {
    return `
You are analyzing a LEADERSHIP interview response.

Question Type: ${classification.type}
Category: ${classification.category}
Expected Skills: ${classification.expectedSkills.join(", ")}

Evaluate the response for:
1. Leadership qualities and vision (40 points)
2. Decision-making and influence (30 points)
3. Communication and impact (30 points)

Look for strategic thinking, team management, and measurable impact.
`;
  }

  private getGeneralAnalysisPrompt(
    classification: QuestionClassification
  ): string {
    return `
You are analyzing a GENERAL interview response.

Question Type: ${classification.type}
Category: ${classification.category}
Expected Skills: ${classification.expectedSkills.join(", ")}

Evaluate the response for:
1. Relevance to the question (40 points)
2. Communication quality (30 points)
3. Content depth and clarity (30 points)

Provide balanced feedback focusing on clarity, relevance, and structure.
`;
  }
}

export const questionClassificationService =
  new QuestionClassificationService();
