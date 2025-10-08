-- ============================================================
-- schema_interview_questions.sql
-- Recreate interview_questions table and supporting objects
-- Difficulty stored as ENUM: 'Easy' | 'Medium' | 'Hard'
-- Supports 4 interview types + 6 Custom domains
-- ============================================================

BEGIN;

-- ---------- Cleanup (drop dependent table first) ----------
DROP TABLE IF EXISTS public.interview_questions CASCADE;

-- Drop types if they already exist (idempotent-ish)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_type_enum') THEN
    DROP TYPE public.interview_type_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_domain_enum') THEN
    DROP TYPE public.custom_domain_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_enum') THEN
    DROP TYPE public.difficulty_enum;
  END IF;
END$$;

-- ---------- Enums ----------
-- 4 interview types
CREATE TYPE public.interview_type_enum AS ENUM
  ('behavioral', 'technical', 'leadership', 'custom');

-- 6 domains used only when interview_type = 'custom'
CREATE TYPE public.custom_domain_enum AS ENUM
  ('product_manager',
   'software_engineer',
   'data_scientist',
   'ui_ux_designer',
   'devops_engineer',
   'ai_engineer');

-- Difficulty as labels (not numbers)
CREATE TYPE public.difficulty_enum AS ENUM ('Easy', 'Medium', 'Hard');

-- ---------- Table ----------
CREATE TABLE public.interview_questions (
  question_id      BIGSERIAL PRIMARY KEY,

  -- What section this question belongs to
  interview_type   public.interview_type_enum NOT NULL,
  -- Only required when interview_type = 'custom'
  custom_domain    public.custom_domain_enum,

  -- The actual question
  question_text    TEXT NOT NULL,

  -- Optional organization helpers
  category         TEXT,                  -- e.g., "Conflict", "System Design", "Metrics"
  focus_areas      TEXT[] DEFAULT '{}',   -- tags, e.g., {'Leadership','Communication'}

  -- Difficulty as labels
  difficulty       public.difficulty_enum NOT NULL,

  -- Lifecycle
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Data integrity:
  -- custom_domain is required iff interview_type = 'custom'
  CONSTRAINT custom_domain_required
    CHECK (
      (interview_type <> 'custom' AND custom_domain IS NULL)
      OR
      (interview_type = 'custom' AND custom_domain IS NOT NULL)
    ),

  -- Avoid duplicate questions within the same type/domain
  CONSTRAINT uq_question_dedup
    UNIQUE (question_text, interview_type, custom_domain)
);

-- ---------- Auto-update updated_at ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_interview_questions_updated_at ON public.interview_questions;

CREATE TRIGGER trg_interview_questions_updated_at
BEFORE UPDATE ON public.interview_questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------- Helpful indexes ----------
-- Quick filters in your UI
CREATE INDEX IF NOT EXISTS ix_interview_questions_type
  ON public.interview_questions (interview_type);

CREATE INDEX IF NOT EXISTS ix_interview_questions_custom_domain
  ON public.interview_questions (custom_domain)
  WHERE interview_type = 'custom';

CREATE INDEX IF NOT EXISTS ix_interview_questions_difficulty
  ON public.interview_questions (difficulty);

CREATE INDEX IF NOT EXISTS ix_interview_questions_is_active
  ON public.interview_questions (is_active);

-- ---------- (Optional) Views for easy querying ----------
CREATE OR REPLACE VIEW public.v_questions_behavioral AS
  SELECT * FROM public.interview_questions
  WHERE interview_type = 'behavioral' AND is_active;

CREATE OR REPLACE VIEW public.v_questions_technical AS
  SELECT * FROM public.interview_questions
  WHERE interview_type = 'technical' AND is_active;

CREATE OR REPLACE VIEW public.v_questions_leadership AS
  SELECT * FROM public.interview_questions
  WHERE interview_type = 'leadership' AND is_active;

CREATE OR REPLACE VIEW public.v_questions_custom AS
  SELECT * FROM public.interview_questions
  WHERE interview_type = 'custom' AND is_active;

COMMIT;

-- ============================================================
-- Usage Examples (run after the schema if you want seed data)
-- ============================================================
-- Behavioral (difficulty labels)
-- INSERT INTO public.interview_questions
-- (interview_type, question_text, difficulty, category, focus_areas)
-- VALUES
-- ('behavioral',
--  'Tell me about a time you resolved a team conflict.',
--  'Medium', 'Conflict', ARRAY['Communication','Leadership']);

-- Technical
-- INSERT INTO public.interview_questions
-- (interview_type, question_text, difficulty, category, focus_areas)
-- VALUES
-- ('technical',
--  'Design a scalable URL shortener.',
--  'Hard', 'System Design', ARRAY['Scalability','Caching']);

-- Leadership
-- INSERT INTO public.interview_questions
-- (interview_type, question_text, difficulty, category, focus_areas)
-- VALUES
-- ('leadership',
--  'Describe a time you influenced without authority.',
--  'Medium', 'Influence', ARRAY['Stakeholder Management']);

-- Custom → Product Manager
-- INSERT INTO public.interview_questions
-- (interview_type, custom_domain, question_text, difficulty, category, focus_areas)
-- VALUES
-- ('custom','product_manager',
--  'How do you prioritize features for the next release?',
--  'Medium', 'Prioritization', ARRAY['Roadmapping','Metrics']);

-- Custom → Data Scientist
-- INSERT INTO public.interview_questions
-- (interview_type, custom_domain, question_text, difficulty)
-- VALUES
-- ('custom','data_scientist',
--  'Explain the bias–variance trade-off.',
--  'Easy');



-- ============================================================
-- seed_behavioral_questions.sql
-- Inserts 15 Behavioral interview questions
-- Requires:
--   - public.interview_questions table
--   - interview_type_enum, difficulty_enum
--   - UNIQUE constraint uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing Behavioral questions to avoid clutter
-- DELETE FROM public.interview_questions WHERE interview_type = 'behavioral';

INSERT INTO public.interview_questions
  (interview_type, question_text, difficulty, category, focus_areas, is_active)
VALUES
  ('behavioral',
   'Tell me about yourself and your background.',
   'Easy',
   'Introduction',
   ARRAY['Communication'],
   TRUE),

  ('behavioral',
   'Describe a challenging project you worked on and how you overcame obstacles.',
   'Medium',
   'Problem Solving',
   ARRAY['Execution','Resilience'],
   TRUE),

  ('behavioral',
   'Tell me about a time when you had to work under pressure.',
   'Medium',
   'Pressure',
   ARRAY['Time Management','Stress Management'],
   TRUE),

  ('behavioral',
   'Describe a situation where you resolved a conflict within your team.',
   'Medium',
   'Conflict',
   ARRAY['Communication','Collaboration'],
   TRUE),

  ('behavioral',
   'Tell me about a time when you had to lead a team or take initiative.',
   'Medium',
   'Leadership',
   ARRAY['Ownership','Influence'],
   TRUE),

  ('behavioral',
   'Give an example of when you made a mistake — how did you handle it?',
   'Medium',
   'Ownership',
   ARRAY['Accountability','Learning'],
   TRUE),

  ('behavioral',
   'Tell me about a time when you had to learn something quickly.',
   'Easy',
   'Learning',
   ARRAY['Adaptability','Problem Solving'],
   TRUE),

  ('behavioral',
   'Describe a situation where you had to manage competing priorities.',
   'Medium',
   'Prioritization',
   ARRAY['Planning','Stakeholder Management'],
   TRUE),

  ('behavioral',
   'Tell me about a time when you disagreed with your manager or a team decision.',
   'Hard',
   'Influence',
   ARRAY['Communication','Negotiation'],
   TRUE),

  ('behavioral',
   'Describe a time when you went above and beyond your regular responsibilities.',
   'Medium',
   'Ownership',
   ARRAY['Initiative','Impact'],
   TRUE),

  ('behavioral',
   'Tell me about a situation where you had limited resources and had to be creative.',
   'Medium',
   'Resourcefulness',
   ARRAY['Creativity','Problem Solving'],
   TRUE),

  ('behavioral',
   'Describe a time when you handled a difficult stakeholder or client.',
   'Hard',
   'Stakeholder Management',
   ARRAY['Empathy','Communication','De-escalation'],
   TRUE),

  ('behavioral',
   'Tell me about a time when you set a goal and achieved it.',
   'Easy',
   'Goals',
   ARRAY['Execution','Metrics'],
   TRUE),

  ('behavioral',
   'Give an example of how you handled feedback or criticism.',
   'Easy',
   'Feedback',
   ARRAY['Growth Mindset','Communication'],
   TRUE),

  ('behavioral',
   'Where do you see yourself in five years?',
   'Easy',
   'Career Goals',
   ARRAY['Vision','Self-awareness'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;




-- ============================================================
-- seed_technical_questions.sql
-- Inserts 15 Technical interview questions
-- Requires:
--   - public.interview_questions table
--   - interview_type_enum, difficulty_enum
--   - UNIQUE constraint uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: clear existing Technical questions
-- DELETE FROM public.interview_questions WHERE interview_type = 'technical';

INSERT INTO public.interview_questions
  (interview_type, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('technical',
   'What is the difference between an array and a linked list?',
   'Easy',
   'Data Structures',
   ARRAY['Memory','Traversal','Insertion/Deletion'],
   TRUE),

  -- 2
  ('technical',
   'How does a hash table work internally, and what are collisions?',
   'Medium',
   'Data Structures',
   ARRAY['Hashing','Collision Handling','Complexity'],
   TRUE),

  -- 3
  ('technical',
   'Explain time and space complexity — what is Big O notation?',
   'Medium',
   'Algorithms',
   ARRAY['Asymptotics','Scalability'],
   TRUE),

  -- 4
  ('technical',
   'What is the difference between SQL and NoSQL databases?',
   'Medium',
   'Databases',
   ARRAY['Relational vs Non-relational','Consistency','Scalability'],
   TRUE),

  -- 5
  ('technical',
   'Explain normalization and denormalization in databases.',
   'Medium',
   'Databases',
   ARRAY['Schema Design','Redundancy','Performance'],
   TRUE),

  -- 6
  ('technical',
   'How does indexing work, and when should you use it?',
   'Medium',
   'Databases',
   ARRAY['B-Tree','Hash Index','Query Performance'],
   TRUE),

  -- 7
  ('technical',
   'What happens when you type a URL into a browser?',
   'Hard',
   'Networking',
   ARRAY['DNS','TLS/HTTPS','TCP/IP','Rendering'],
   TRUE),

  -- 8
  ('technical',
   'Explain REST vs GraphQL APIs and when to use each.',
   'Medium',
   'APIs',
   ARRAY['Contracts','Over/Under-fetching','Caching'],
   TRUE),

  -- 9
  ('technical',
   'What are HTTP methods (GET, POST, PUT, DELETE) and common status codes (200, 404, 500)?',
   'Easy',
   'Web Fundamentals',
   ARRAY['HTTP Methods','Status Codes'],
   TRUE),

  -- 10
  ('technical',
   'How would you design a scalable system (e.g., a URL shortener or chat app)?',
   'Hard',
   'System Design',
   ARRAY['Sharding','Caching','Queues','Data Model'],
   TRUE),

  -- 11
  ('technical',
   'What is the difference between monolithic and microservices architecture?',
   'Medium',
   'Architecture',
   ARRAY['Coupling','Deployability','Observability'],
   TRUE),

  -- 12
  ('technical',
   'Explain caching and its role in system performance (e.g., Redis, CDN).',
   'Medium',
   'Performance',
   ARRAY['Latency','Hit Ratio','Invalidation'],
   TRUE),

  -- 13
  ('technical',
   'What are containers, and how does Docker differ from a virtual machine?',
   'Medium',
   'DevOps',
   ARRAY['Isolation','Images','Overhead'],
   TRUE),

  -- 14
  ('technical',
   'Explain Continuous Integration and Continuous Deployment (CI/CD).',
   'Easy',
   'DevOps',
   ARRAY['Automation','Testing','Pipelines'],
   TRUE),

  -- 15
  ('technical',
   'What are the main differences between AWS, Azure, and Google Cloud?',
   'Medium',
   'Cloud',
   ARRAY['Services','Pricing Models','Managed Offerings'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;



-- ============================================================
-- seed_leadership_questions.sql
-- Inserts 15 Leadership interview questions
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: clear existing leadership questions
-- DELETE FROM public.interview_questions WHERE interview_type = 'leadership';

INSERT INTO public.interview_questions
  (interview_type, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('leadership',
   'Tell me about a time when you led a team to achieve a challenging goal.',
   'Medium',
   'Leadership',
   ARRAY['Goal Setting','Motivation','Team Management'],
   TRUE),

  -- 2
  ('leadership',
   'Describe your leadership style. How do you adapt it to different situations?',
   'Easy',
   'Leadership Style',
   ARRAY['Adaptability','Communication','Self-awareness'],
   TRUE),

  -- 3
  ('leadership',
   'Give an example of when you had to motivate a team under pressure.',
   'Medium',
   'Motivation',
   ARRAY['Team Building','Inspiration','Performance'],
   TRUE),

  -- 4
  ('leadership',
   'Tell me about a time you had to make a difficult decision as a leader.',
   'Hard',
   'Decision Making',
   ARRAY['Critical Thinking','Responsibility','Ethics'],
   TRUE),

  -- 5
  ('leadership',
   'How do you handle conflict or disagreement within your team?',
   'Medium',
   'Conflict Resolution',
   ARRAY['Empathy','Mediation','Team Harmony'],
   TRUE),

  -- 6
  ('leadership',
   'Describe a time when you delegated a task effectively.',
   'Easy',
   'Delegation',
   ARRAY['Trust','Accountability','Teamwork'],
   TRUE),

  -- 7
  ('leadership',
   'Tell me about a time you had to influence others without formal authority.',
   'Hard',
   'Influence',
   ARRAY['Persuasion','Negotiation','Stakeholder Management'],
   TRUE),

  -- 8
  ('leadership',
   'How do you ensure accountability within your team?',
   'Medium',
   'Accountability',
   ARRAY['Ownership','Transparency','Trust'],
   TRUE),

  -- 9
  ('leadership',
   'Describe a time when you helped develop or mentor someone on your team.',
   'Medium',
   'Mentorship',
   ARRAY['Coaching','Feedback','Career Growth'],
   TRUE),

  -- 10
  ('leadership',
   'Tell me about a time when your team failed. How did you handle it?',
   'Medium',
   'Failure Management',
   ARRAY['Resilience','Learning','Responsibility'],
   TRUE),

  -- 11
  ('leadership',
   'How do you handle team members who are underperforming?',
   'Medium',
   'Performance Management',
   ARRAY['Feedback','Empathy','Improvement'],
   TRUE),

  -- 12
  ('leadership',
   'Describe a situation where you had to balance short-term goals with long-term vision.',
   'Hard',
   'Strategic Thinking',
   ARRAY['Prioritization','Vision','Planning'],
   TRUE),

  -- 13
  ('leadership',
   'Tell me about a time when you had to communicate a tough message to your team.',
   'Medium',
   'Communication',
   ARRAY['Clarity','Empathy','Transparency'],
   TRUE),

  -- 14
  ('leadership',
   'What do you believe are the most important qualities of an effective leader?',
   'Easy',
   'Leadership Philosophy',
   ARRAY['Integrity','Empathy','Vision'],
   TRUE),

  -- 15
  ('leadership',
   'Give an example of how you build trust and collaboration within a diverse team.',
   'Medium',
   'Team Building',
   ARRAY['Inclusion','Trust','Collaboration'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;



-- ============================================================
-- seed_product_manager_questions.sql
-- Inserts 15 Product Manager interview questions (Custom Domain)
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, custom_domain_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing PM questions to avoid duplicates
-- DELETE FROM public.interview_questions 
-- WHERE interview_type = 'custom' AND custom_domain = 'product_manager';

INSERT INTO public.interview_questions
  (interview_type, custom_domain, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('custom', 'product_manager',
   'How do you define a great product?',
   'Easy',
   'Product Strategy',
   ARRAY['Vision','User-Centric Design'],
   TRUE),

  -- 2
  ('custom', 'product_manager',
   'Tell me about a product you admire — what makes it successful?',
   'Easy',
   'Product Sense',
   ARRAY['User Experience','Market Fit'],
   TRUE),

  -- 3
  ('custom', 'product_manager',
   'How would you improve one of our company’s products?',
   'Medium',
   'Product Improvement',
   ARRAY['Analysis','Strategy','Creativity'],
   TRUE),

  -- 4
  ('custom', 'product_manager',
   'How do you decide what features to prioritize for the next release?',
   'Medium',
   'Prioritization',
   ARRAY['RICE','MoSCoW','Stakeholder Alignment'],
   TRUE),

  -- 5
  ('custom', 'product_manager',
   'Describe how you would evaluate product-market fit.',
   'Medium',
   'Product Strategy',
   ARRAY['Metrics','Customer Feedback','Iteration'],
   TRUE),

  -- 6
  ('custom', 'product_manager',
   'Tell me about a time you managed conflicting stakeholder priorities.',
   'Hard',
   'Stakeholder Management',
   ARRAY['Negotiation','Alignment','Communication'],
   TRUE),

  -- 7
  ('custom', 'product_manager',
   'How do you define and measure success for a new feature or product?',
   'Medium',
   'Metrics',
   ARRAY['KPI','Success Metrics','ROI'],
   TRUE),

  -- 8
  ('custom', 'product_manager',
   'Explain how you use data in your decision-making process.',
   'Medium',
   'Data-Driven Decisions',
   ARRAY['Analytics','A/B Testing','Insights'],
   TRUE),

  -- 9
  ('custom', 'product_manager',
   'Describe your process for writing a Product Requirements Document (PRD).',
   'Medium',
   'Execution',
   ARRAY['Documentation','Clarity','Cross-functional Collaboration'],
   TRUE),

  -- 10
  ('custom', 'product_manager',
   'What would you do if engineering tells you a key feature will be delayed by two months?',
   'Medium',
   'Execution',
   ARRAY['Risk Management','Communication','Prioritization'],
   TRUE),

  -- 11
  ('custom', 'product_manager',
   'Tell me about a time when you had to influence a team without direct authority.',
   'Medium',
   'Leadership',
   ARRAY['Influence','Collaboration','Communication'],
   TRUE),

  -- 12
  ('custom', 'product_manager',
   'Describe how you collaborate with design, engineering, and marketing teams.',
   'Easy',
   'Collaboration',
   ARRAY['Cross-functional Teams','Alignment','Execution'],
   TRUE),

  -- 13
  ('custom', 'product_manager',
   'Tell me about a time when you disagreed with a stakeholder or leadership — what did you do?',
   'Hard',
   'Conflict Management',
   ARRAY['Empathy','Influence','Communication'],
   TRUE),

  -- 14
  ('custom', 'product_manager',
   'How would you evaluate whether to build, buy, or partner for a new product capability?',
   'Medium',
   'Product Strategy',
   ARRAY['ROI','Cost-Benefit','Feasibility'],
   TRUE),

  -- 15
  ('custom', 'product_manager',
   'If your product’s engagement dropped by 20% last month, how would you identify the cause?',
   'Hard',
   'Product Analytics',
   ARRAY['Metrics','Root Cause Analysis','User Research'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;



-- ============================================================
-- seed_software_engineer_questions.sql
-- Inserts 15 Software Engineer interview questions (Custom Domain)
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, custom_domain_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing Software Engineer questions
-- DELETE FROM public.interview_questions 
-- WHERE interview_type = 'custom' AND custom_domain = 'software_engineer';

INSERT INTO public.interview_questions
  (interview_type, custom_domain, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('custom', 'software_engineer',
   'What is the difference between a stack and a queue?',
   'Easy',
   'Data Structures',
   ARRAY['LIFO','FIFO','Implementation'],
   TRUE),

  -- 2
  ('custom', 'software_engineer',
   'Explain how a hash map works. What are hash collisions and how are they handled?',
   'Medium',
   'Data Structures',
   ARRAY['Hashing','Collision Resolution','Efficiency'],
   TRUE),

  -- 3
  ('custom', 'software_engineer',
   'How would you find the duplicate number in an array?',
   'Medium',
   'Algorithms',
   ARRAY['Searching','Optimization','Complexity'],
   TRUE),

  -- 4
  ('custom', 'software_engineer',
   'What’s the difference between a process and a thread?',
   'Medium',
   'Operating Systems',
   ARRAY['Concurrency','Parallelism','Scheduling'],
   TRUE),

  -- 5
  ('custom', 'software_engineer',
   'Explain recursion and give an example where it’s useful.',
   'Easy',
   'Algorithms',
   ARRAY['Recursion','Base Case','Divide and Conquer'],
   TRUE),

  -- 6
  ('custom', 'software_engineer',
   'How would you design a scalable URL shortener (like bit.ly)?',
   'Hard',
   'System Design',
   ARRAY['Scalability','Database Design','Caching'],
   TRUE),

  -- 7
  ('custom', 'software_engineer',
   'Explain the difference between monolithic and microservices architecture.',
   'Medium',
   'Architecture',
   ARRAY['Decoupling','Maintainability','Deployment'],
   TRUE),

  -- 8
  ('custom', 'software_engineer',
   'What is caching? How does it improve system performance?',
   'Medium',
   'Performance',
   ARRAY['Latency','Throughput','Optimization'],
   TRUE),

  -- 9
  ('custom', 'software_engineer',
   'How would you handle millions of users hitting your API simultaneously?',
   'Hard',
   'Scalability',
   ARRAY['Load Balancing','Rate Limiting','CDN'],
   TRUE),

  -- 10
  ('custom', 'software_engineer',
   'What is normalization, and why is it important in databases?',
   'Medium',
   'Databases',
   ARRAY['1NF','2NF','3NF','Redundancy Reduction'],
   TRUE),

  -- 11
  ('custom', 'software_engineer',
   'Explain the difference between SQL joins (INNER, LEFT, RIGHT, FULL).',
   'Easy',
   'Databases',
   ARRAY['Join Types','Relational Data','Querying'],
   TRUE),

  -- 12
  ('custom', 'software_engineer',
   'How do transactions ensure data consistency? What are ACID properties?',
   'Medium',
   'Databases',
   ARRAY['Atomicity','Consistency','Isolation','Durability'],
   TRUE),

  -- 13
  ('custom', 'software_engineer',
   'Tell me about a time you faced a production bug — how did you handle it?',
   'Medium',
   'Problem Solving',
   ARRAY['Debugging','Root Cause Analysis','Communication'],
   TRUE),

  -- 14
  ('custom', 'software_engineer',
   'How do you ensure code quality and maintainability in a team project?',
   'Medium',
   'Software Practices',
   ARRAY['Code Review','Testing','Clean Code'],
   TRUE),

  -- 15
  ('custom', 'software_engineer',
   'Describe your experience with version control (e.g., Git branching strategy).',
   'Easy',
   'Collaboration',
   ARRAY['Git','Branching','Merging'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;


-- ============================================================
-- seed_data_scientist_questions.sql
-- Inserts 15 Data Scientist interview questions (Custom Domain)
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, custom_domain_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing Data Scientist questions
-- DELETE FROM public.interview_questions 
-- WHERE interview_type = 'custom' AND custom_domain = 'data_scientist';

INSERT INTO public.interview_questions
  (interview_type, custom_domain, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('custom', 'data_scientist',
   'What is the difference between correlation and causation?',
   'Easy',
   'Statistics',
   ARRAY['Correlation','Causality','Inference'],
   TRUE),

  -- 2
  ('custom', 'data_scientist',
   'Explain bias-variance trade-off in machine learning.',
   'Medium',
   'Machine Learning',
   ARRAY['Model Performance','Overfitting','Underfitting'],
   TRUE),

  -- 3
  ('custom', 'data_scientist',
   'What are Type I and Type II errors?',
   'Easy',
   'Statistics',
   ARRAY['Hypothesis Testing','False Positive','False Negative'],
   TRUE),

  -- 4
  ('custom', 'data_scientist',
   'What is p-value, and how do you interpret it in hypothesis testing?',
   'Medium',
   'Statistics',
   ARRAY['Significance','Confidence Level','Testing'],
   TRUE),

  -- 5
  ('custom', 'data_scientist',
   'Explain the difference between population and sample.',
   'Easy',
   'Statistics',
   ARRAY['Sampling','Population','Inference'],
   TRUE),

  -- 6
  ('custom', 'data_scientist',
   'What’s the difference between supervised and unsupervised learning?',
   'Easy',
   'Machine Learning',
   ARRAY['Classification','Clustering','Regression'],
   TRUE),

  -- 7
  ('custom', 'data_scientist',
   'How do you handle overfitting in a model?',
   'Medium',
   'Machine Learning',
   ARRAY['Regularization','Cross Validation','Pruning'],
   TRUE),

  -- 8
  ('custom', 'data_scientist',
   'What is regularization (L1 vs L2), and why is it important?',
   'Medium',
   'Machine Learning',
   ARRAY['Lasso','Ridge','Overfitting Control'],
   TRUE),

  -- 9
  ('custom', 'data_scientist',
   'How do decision trees and random forests differ?',
   'Medium',
   'Machine Learning',
   ARRAY['Ensemble Learning','Interpretability','Variance Reduction'],
   TRUE),

  -- 10
  ('custom', 'data_scientist',
   'How would you evaluate model performance — which metrics would you use?',
   'Medium',
   'Model Evaluation',
   ARRAY['Accuracy','Precision','Recall','F1-score','ROC-AUC'],
   TRUE),

  -- 11
  ('custom', 'data_scientist',
   'How do you handle missing or inconsistent data?',
   'Medium',
   'Data Cleaning',
   ARRAY['Imputation','Outlier Detection','Normalization'],
   TRUE),

  -- 12
  ('custom', 'data_scientist',
   'Explain the difference between long and wide data formats.',
   'Easy',
   'Data Wrangling',
   ARRAY['Pivoting','Data Transformation','Analytics'],
   TRUE),

  -- 13
  ('custom', 'data_scientist',
   'What is feature scaling, and why is it necessary?',
   'Easy',
   'Preprocessing',
   ARRAY['Normalization','Standardization','Distance Metrics'],
   TRUE),

  -- 14
  ('custom', 'data_scientist',
   'Describe a data project you worked on — what problem were you solving and what impact did it have?',
   'Hard',
   'Applied Data Science',
   ARRAY['Problem Solving','Impact','Storytelling'],
   TRUE),

  -- 15
  ('custom', 'data_scientist',
   'How do you communicate complex data insights to non-technical stakeholders?',
   'Medium',
   'Communication',
   ARRAY['Visualization','Storytelling','Decision Making'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;


-- ============================================================
-- seed_ui_ux_designer_questions.sql
-- Inserts 15 UI/UX Designer interview questions (Custom Domain)
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, custom_domain_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing UI/UX Designer questions
-- DELETE FROM public.interview_questions 
-- WHERE interview_type = 'custom' AND custom_domain = 'ui_ux_designer';

INSERT INTO public.interview_questions
  (interview_type, custom_domain, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('custom', 'ui_ux_designer',
   'How do you define good user experience?',
   'Easy',
   'User Experience',
   ARRAY['Usability','Empathy','Accessibility'],
   TRUE),

  -- 2
  ('custom', 'ui_ux_designer',
   'Describe your design process — from research to final implementation.',
   'Medium',
   'Design Process',
   ARRAY['Research','Wireframing','Prototyping','Testing'],
   TRUE),

  -- 3
  ('custom', 'ui_ux_designer',
   'How do you conduct user research, and what methods do you prefer?',
   'Medium',
   'User Research',
   ARRAY['Surveys','Interviews','Usability Testing'],
   TRUE),

  -- 4
  ('custom', 'ui_ux_designer',
   'Tell me about a time when user feedback changed your design direction.',
   'Medium',
   'User Feedback',
   ARRAY['Iteration','Empathy','Improvement'],
   TRUE),

  -- 5
  ('custom', 'ui_ux_designer',
   'How do you balance user needs with business goals?',
   'Hard',
   'Design Strategy',
   ARRAY['Trade-offs','Stakeholder Management','Prioritization'],
   TRUE),

  -- 6
  ('custom', 'ui_ux_designer',
   'How do you approach designing for accessibility and inclusivity?',
   'Medium',
   'Accessibility',
   ARRAY['WCAG','Inclusivity','Design Ethics'],
   TRUE),

  -- 7
  ('custom', 'ui_ux_designer',
   'Describe a UX problem you solved — what was your process and result?',
   'Medium',
   'Problem Solving',
   ARRAY['Research','Iteration','Testing'],
   TRUE),

  -- 8
  ('custom', 'ui_ux_designer',
   'What metrics do you use to evaluate design success?',
   'Medium',
   'UX Metrics',
   ARRAY['Conversion Rate','Task Success','User Satisfaction'],
   TRUE),

  -- 9
  ('custom', 'ui_ux_designer',
   'How do you handle conflicting feedback from users or stakeholders?',
   'Medium',
   'Stakeholder Management',
   ARRAY['Negotiation','Communication','Prioritization'],
   TRUE),

  -- 10
  ('custom', 'ui_ux_designer',
   'Tell me about a design you’re most proud of and why.',
   'Easy',
   'Portfolio',
   ARRAY['Creativity','Impact','Storytelling'],
   TRUE),

  -- 11
  ('custom', 'ui_ux_designer',
   'What’s the difference between UX and UI design?',
   'Easy',
   'Design Fundamentals',
   ARRAY['UX','UI','Design Thinking'],
   TRUE),

  -- 12
  ('custom', 'ui_ux_designer',
   'Which design tools do you use (e.g., Figma, Sketch, Adobe XD) and why?',
   'Easy',
   'Tools & Software',
   ARRAY['Figma','Prototyping','Collaboration'],
   TRUE),

  -- 13
  ('custom', 'ui_ux_designer',
   'How do you ensure consistency in design systems across different platforms?',
   'Medium',
   'Design Systems',
   ARRAY['Component Libraries','Style Guides','Consistency'],
   TRUE),

  -- 14
  ('custom', 'ui_ux_designer',
   'How do you work with developers to ensure your designs are implemented correctly?',
   'Medium',
   'Collaboration',
   ARRAY['Design Handoff','Communication','QA'],
   TRUE),

  -- 15
  ('custom', 'ui_ux_designer',
   'How do you present and justify your design decisions to non-design stakeholders?',
   'Hard',
   'Communication',
   ARRAY['Storytelling','Rationale','Persuasion'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;


-- ============================================================
-- seed_devops_engineer_questions.sql
-- Inserts 15 DevOps Engineer interview questions (Custom Domain)
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, custom_domain_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing DevOps Engineer questions
-- DELETE FROM public.interview_questions 
-- WHERE interview_type = 'custom' AND custom_domain = 'devops_engineer';

INSERT INTO public.interview_questions
  (interview_type, custom_domain, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('custom', 'devops_engineer',
   'What is DevOps, and how does it differ from traditional software development?',
   'Easy',
   'DevOps Fundamentals',
   ARRAY['Culture','Collaboration','Automation'],
   TRUE),

  -- 2
  ('custom', 'devops_engineer',
   'What are the main benefits of implementing DevOps practices?',
   'Easy',
   'DevOps Fundamentals',
   ARRAY['Speed','Reliability','Continuous Improvement'],
   TRUE),

  -- 3
  ('custom', 'devops_engineer',
   'Explain the key phases of a DevOps lifecycle.',
   'Medium',
   'DevOps Lifecycle',
   ARRAY['Plan','Build','Test','Deploy','Monitor'],
   TRUE),

  -- 4
  ('custom', 'devops_engineer',
   'What is Continuous Integration and Continuous Deployment (CI/CD)?',
   'Medium',
   'Automation',
   ARRAY['Pipelines','Testing','Release Automation'],
   TRUE),

  -- 5
  ('custom', 'devops_engineer',
   'Which CI/CD tools have you used (e.g., Jenkins, GitHub Actions, GitLab CI)?',
   'Easy',
   'Tools',
   ARRAY['CI/CD','Jenkins','GitHub Actions','GitLab'],
   TRUE),

  -- 6
  ('custom', 'devops_engineer',
   'How do you handle rollback in a failed deployment?',
   'Medium',
   'Deployment Management',
   ARRAY['Blue-Green Deployment','Versioning','Automation'],
   TRUE),

  -- 7
  ('custom', 'devops_engineer',
   'Explain Infrastructure as Code (IaC) and tools like Terraform or Ansible.',
   'Medium',
   'Infrastructure',
   ARRAY['IaC','Terraform','Ansible','Automation'],
   TRUE),

  -- 8
  ('custom', 'devops_engineer',
   'What’s the difference between Docker and a virtual machine?',
   'Easy',
   'Containers',
   ARRAY['Docker','VMs','Resource Efficiency'],
   TRUE),

  -- 9
  ('custom', 'devops_engineer',
   'How does Kubernetes help in container orchestration?',
   'Medium',
   'Containers & Orchestration',
   ARRAY['Kubernetes','Scaling','Pod Management'],
   TRUE),

  -- 10
  ('custom', 'devops_engineer',
   'Explain how you would design a scalable infrastructure on AWS or Azure.',
   'Hard',
   'Cloud Architecture',
   ARRAY['AWS','Azure','Scalability','Load Balancing'],
   TRUE),

  -- 11
  ('custom', 'devops_engineer',
   'What tools do you use for monitoring and logging (e.g., Prometheus, Grafana, ELK Stack)?',
   'Medium',
   'Monitoring & Logging',
   ARRAY['Prometheus','Grafana','ELK','Observability'],
   TRUE),

  -- 12
  ('custom', 'devops_engineer',
   'How do you ensure system reliability and uptime in production?',
   'Medium',
   'Reliability',
   ARRAY['SLA','Incident Response','Automation'],
   TRUE),

  -- 13
  ('custom', 'devops_engineer',
   'What security practices do you follow in DevOps pipelines?',
   'Hard',
   'Security',
   ARRAY['DevSecOps','Secrets Management','Vulnerability Scanning'],
   TRUE),

  -- 14
  ('custom', 'devops_engineer',
   'Tell me about a time when a production deployment went wrong — how did you handle it?',
   'Hard',
   'Incident Management',
   ARRAY['Crisis Management','Root Cause Analysis','Postmortem'],
   TRUE),

  -- 15
  ('custom', 'devops_engineer',
   'How do you promote collaboration between development and operations teams?',
   'Medium',
   'Culture & Collaboration',
   ARRAY['Communication','Process Improvement','Agile Practices'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;


-- ============================================================
-- seed_ai_engineer_questions.sql
-- Inserts 15 AI Engineer interview questions (Custom Domain)
-- Requires:
--   - public.interview_questions table
--   - ENUM types: interview_type_enum, custom_domain_enum, difficulty_enum
--   - UNIQUE constraint: uq_question_dedup (question_text, interview_type, custom_domain)
-- ============================================================

BEGIN;

-- Optional: remove existing AI Engineer questions
-- DELETE FROM public.interview_questions 
-- WHERE interview_type = 'custom' AND custom_domain = 'ai_engineer';

INSERT INTO public.interview_questions
  (interview_type, custom_domain, question_text, difficulty, category, focus_areas, is_active)
VALUES
  -- 1
  ('custom', 'ai_engineer',
   'What is the difference between Artificial Intelligence, Machine Learning, and Deep Learning?',
   'Easy',
   'AI Fundamentals',
   ARRAY['AI vs ML vs DL','Hierarchy','Conceptual Understanding'],
   TRUE),

  -- 2
  ('custom', 'ai_engineer',
   'Explain supervised, unsupervised, and reinforcement learning with examples.',
   'Medium',
   'Machine Learning Types',
   ARRAY['Supervised','Unsupervised','Reinforcement'],
   TRUE),

  -- 3
  ('custom', 'ai_engineer',
   'What is overfitting, and how can it be prevented?',
   'Medium',
   'Model Training',
   ARRAY['Overfitting','Regularization','Cross Validation'],
   TRUE),

  -- 4
  ('custom', 'ai_engineer',
   'How do you handle imbalanced datasets in classification problems?',
   'Medium',
   'Data Preparation',
   ARRAY['Sampling','Class Weights','SMOTE'],
   TRUE),

  -- 5
  ('custom', 'ai_engineer',
   'What are common evaluation metrics for regression and classification models?',
   'Medium',
   'Model Evaluation',
   ARRAY['Accuracy','F1-score','RMSE','AUC-ROC'],
   TRUE),

  -- 6
  ('custom', 'ai_engineer',
   'Explain how a neural network learns — what happens during backpropagation?',
   'Hard',
   'Deep Learning',
   ARRAY['Neural Networks','Gradients','Optimization'],
   TRUE),

  -- 7
  ('custom', 'ai_engineer',
   'What is the role of activation functions in neural networks?',
   'Easy',
   'Deep Learning',
   ARRAY['ReLU','Sigmoid','Tanh','Non-linearity'],
   TRUE),

  -- 8
  ('custom', 'ai_engineer',
   'What is the difference between CNNs, RNNs, and Transformers?',
   'Medium',
   'Deep Learning Architectures',
   ARRAY['CNN','RNN','Transformer','Applications'],
   TRUE),

  -- 9
  ('custom', 'ai_engineer',
   'How do you prevent vanishing or exploding gradients in deep learning models?',
   'Hard',
   'Optimization',
   ARRAY['Gradient Clipping','Batch Normalization','Initialization'],
   TRUE),

  -- 10
  ('custom', 'ai_engineer',
   'What are some common optimization algorithms (e.g., SGD, Adam) and how do they differ?',
   'Medium',
   'Training Optimization',
   ARRAY['SGD','Adam','Learning Rate','Momentum'],
   TRUE),

  -- 11
  ('custom', 'ai_engineer',
   'How would you deploy a machine learning model to production?',
   'Medium',
   'Deployment',
   ARRAY['Model Serving','APIs','Containerization'],
   TRUE),

  -- 12
  ('custom', 'ai_engineer',
   'What is model drift, and how do you monitor models post-deployment?',
   'Medium',
   'Monitoring',
   ARRAY['Concept Drift','Data Drift','Model Retraining'],
   TRUE),

  -- 13
  ('custom', 'ai_engineer',
   'How do you ensure fairness, transparency, and explainability in AI systems?',
   'Hard',
   'Ethical AI',
   ARRAY['Bias','Explainability','Fairness'],
   TRUE),

  -- 14
  ('custom', 'ai_engineer',
   'What are embeddings, and why are they important in NLP models?',
   'Medium',
   'Natural Language Processing',
   ARRAY['Word2Vec','BERT','Vector Representations'],
   TRUE),

  -- 15
  ('custom', 'ai_engineer',
   'Describe a real-world AI project you’ve worked on — what was the problem, approach, and outcome?',
   'Hard',
   'Applied AI',
   ARRAY['Problem Solving','Model Building','Impact'],
   TRUE)
ON CONFLICT ON CONSTRAINT uq_question_dedup DO NOTHING;

COMMIT;
