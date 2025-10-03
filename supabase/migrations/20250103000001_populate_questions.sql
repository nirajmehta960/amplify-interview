-- Clear existing questions to avoid duplicates
DELETE FROM public.interview_questions;

-- Insert Behavioral Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('Tell me about yourself and your background.', 'Introduction', 1, 'behavioral', 30, null, ARRAY['Communication']),
('Describe a challenging project you worked on and how you overcame obstacles.', 'Experience', 3, 'behavioral', 60, null, ARRAY['Problem Solving', 'Communication']),
('How do you handle working under pressure?', 'Behavioral', 2, 'behavioral', 45, null, ARRAY['Stress Management', 'Adaptability']),
('What are your greatest strengths and how do they help you in your work?', 'Strengths', 2, 'behavioral', 45, null, ARRAY['Self Assessment', 'Communication']),
('Tell me about a time when you had to work with a difficult team member.', 'Teamwork', 3, 'behavioral', 60, null, ARRAY['Teamwork', 'Conflict Resolution']),
('Where do you see yourself in 5 years?', 'Career Goals', 2, 'behavioral', 45, null, ARRAY['Communication', 'Planning']),
('Describe a time when you failed and what you learned from it.', 'Resilience', 3, 'behavioral', 60, null, ARRAY['Learning', 'Self Assessment']),
('Tell me about a time when you had to make a difficult decision.', 'Decision Making', 3, 'behavioral', 60, null, ARRAY['Decision Making', 'Leadership']),
('How do you prioritize your work when you have multiple deadlines?', 'Time Management', 2, 'behavioral', 45, null, ARRAY['Time Management', 'Organization']),
('Describe a situation where you had to resolve a conflict between team members.', 'Conflict Resolution', 3, 'behavioral', 60, null, ARRAY['Conflict Resolution', 'Leadership']),
('Tell me about a time when you went above and beyond for a project.', 'Initiative', 2, 'behavioral', 45, null, ARRAY['Initiative', 'Dedication']),
('How do you handle constructive criticism?', 'Feedback', 2, 'behavioral', 45, null, ARRAY['Feedback', 'Growth Mindset']),
('Describe a time when you had to learn something new quickly.', 'Learning', 2, 'behavioral', 45, null, ARRAY['Learning', 'Adaptability']),
('Tell me about a time when you had to persuade someone to see your point of view.', 'Influence', 3, 'behavioral', 60, null, ARRAY['Influence', 'Communication']),
('What motivates you in your work?', 'Motivation', 1, 'behavioral', 30, null, ARRAY['Motivation', 'Self Awareness']);

-- Insert Technical Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('Explain the difference between a stack and a queue. When would you use each?', 'Data Structures', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'Problem Solving']),
('How would you optimize a slow database query?', 'Database', 3, 'technical', 60, 'Technology', ARRAY['Technical Skills', 'Performance']),
('Explain the concept of object-oriented programming and its main principles.', 'OOP', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'Programming Concepts']),
('How would you design a URL shortening service like bit.ly?', 'System Design', 4, 'technical', 90, 'Technology', ARRAY['System Design', 'Architecture']),
('What is the difference between REST and GraphQL APIs?', 'APIs', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'API Design']),
('How would you handle memory leaks in a JavaScript application?', 'Memory Management', 3, 'technical', 60, 'Technology', ARRAY['Technical Skills', 'Debugging']),
('Explain the concept of microservices architecture and its benefits.', 'Architecture', 3, 'technical', 60, 'Technology', ARRAY['Architecture', 'System Design']),
('How would you implement a caching strategy for a web application?', 'Caching', 3, 'technical', 60, 'Technology', ARRAY['Technical Skills', 'Performance']),
('What are the differences between SQL and NoSQL databases?', 'Database', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'Database Design']),
('How would you ensure data consistency in a distributed system?', 'Distributed Systems', 4, 'technical', 90, 'Technology', ARRAY['System Design', 'Distributed Systems']),
('Explain the concept of version control and best practices for Git.', 'Version Control', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'Collaboration']),
('How would you approach debugging a production issue?', 'Debugging', 3, 'technical', 60, 'Technology', ARRAY['Technical Skills', 'Problem Solving']),
('What is the difference between synchronous and asynchronous programming?', 'Programming Concepts', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'Programming Concepts']),
('How would you implement authentication and authorization in a web app?', 'Security', 3, 'technical', 60, 'Technology', ARRAY['Technical Skills', 'Security']),
('Explain the concept of test-driven development (TDD).', 'Testing', 2, 'technical', 45, 'Technology', ARRAY['Technical Skills', 'Testing']);

-- Insert Leadership Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('How do you motivate a team that is struggling with low morale?', 'Team Motivation', 3, 'leadership', 60, null, ARRAY['Leadership', 'Team Management']),
('Describe a time when you had to make an unpopular decision for the good of the team.', 'Decision Making', 3, 'leadership', 60, null, ARRAY['Leadership', 'Decision Making']),
('How do you handle team members who consistently miss deadlines?', 'Performance Management', 3, 'leadership', 60, null, ARRAY['Leadership', 'Performance Management']),
('Tell me about a time when you had to lead a team through a major change.', 'Change Management', 3, 'leadership', 60, null, ARRAY['Leadership', 'Change Management']),
('How do you balance being a leader and being a team player?', 'Leadership Style', 2, 'leadership', 45, null, ARRAY['Leadership', 'Teamwork']),
('Describe a situation where you had to manage a team with diverse personalities.', 'Team Dynamics', 3, 'leadership', 60, null, ARRAY['Leadership', 'Team Management']),
('How do you ensure your team understands and aligns with company goals?', 'Alignment', 2, 'leadership', 45, null, ARRAY['Leadership', 'Strategic Thinking']),
('Tell me about a time when you had to give difficult feedback to a team member.', 'Feedback', 3, 'leadership', 60, null, ARRAY['Leadership', 'Communication']),
('How do you delegate tasks effectively while ensuring quality?', 'Delegation', 2, 'leadership', 45, null, ARRAY['Leadership', 'Task Management']),
('Describe a time when you had to resolve a conflict between two key team members.', 'Conflict Resolution', 3, 'leadership', 60, null, ARRAY['Leadership', 'Conflict Resolution']),
('How do you measure the success of your team?', 'Performance Metrics', 2, 'leadership', 45, null, ARRAY['Leadership', 'Performance Management']),
('Tell me about a time when you had to step back and let someone else lead.', 'Humble Leadership', 3, 'leadership', 60, null, ARRAY['Leadership', 'Self Awareness']),
('How do you develop talent within your team?', 'Talent Development', 2, 'leadership', 45, null, ARRAY['Leadership', 'Mentoring']),
('Describe a time when you had to pivot your team strategy mid-project.', 'Strategic Thinking', 3, 'leadership', 60, null, ARRAY['Leadership', 'Strategic Thinking']),
('How do you create a culture of innovation within your team?', 'Innovation', 3, 'leadership', 60, null, ARRAY['Leadership', 'Innovation']);

-- Insert Product Manager Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('How do you prioritize features in a product roadmap?', 'Product Strategy', 3, 'custom', 60, 'Product Manager', ARRAY['Product Strategy', 'Prioritization']),
('Describe your approach to user research and how it influences product decisions.', 'User Research', 2, 'custom', 45, 'Product Manager', ARRAY['User Research', 'Decision Making']),
('How do you handle competing stakeholder demands?', 'Stakeholder Management', 3, 'custom', 60, 'Product Manager', ARRAY['Stakeholder Management', 'Communication']),
('Tell me about a time when you had to pivot a product strategy.', 'Product Pivots', 3, 'custom', 60, 'Product Manager', ARRAY['Product Strategy', 'Adaptability']),
('How do you measure product success and what metrics do you use?', 'Product Metrics', 2, 'custom', 45, 'Product Manager', ARRAY['Product Metrics', 'Analytics']),
('Describe your experience with agile product development.', 'Agile', 2, 'custom', 45, 'Product Manager', ARRAY['Agile', 'Process Management']),
('How do you balance user needs with business objectives?', 'Balancing Priorities', 3, 'custom', 60, 'Product Manager', ARRAY['Product Strategy', 'Business Acumen']),
('Tell me about a time when you had to say no to a feature request.', 'Decision Making', 3, 'custom', 60, 'Product Manager', ARRAY['Decision Making', 'Prioritization']),
('How do you approach competitive analysis?', 'Market Analysis', 2, 'custom', 45, 'Product Manager', ARRAY['Market Analysis', 'Strategic Thinking']),
('Describe your experience working with engineering teams.', 'Cross-functional Collaboration', 2, 'custom', 45, 'Product Manager', ARRAY['Collaboration', 'Technical Understanding']),
('How do you handle product launches and go-to-market strategies?', 'Product Launch', 3, 'custom', 60, 'Product Manager', ARRAY['Product Launch', 'Marketing']),
('Tell me about a time when a product did not meet expectations.', 'Product Failure', 3, 'custom', 60, 'Product Manager', ARRAY['Product Management', 'Learning']),
('How do you approach A/B testing and experimentation?', 'Experimentation', 2, 'custom', 45, 'Product Manager', ARRAY['Experimentation', 'Data Analysis']),
('Describe your approach to defining product requirements.', 'Requirements', 2, 'custom', 45, 'Product Manager', ARRAY['Requirements', 'Documentation']),
('How do you stay updated on industry trends and emerging technologies?', 'Industry Knowledge', 2, 'custom', 45, 'Product Manager', ARRAY['Industry Knowledge', 'Learning']);

-- Insert Software Engineer Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('How do you approach code reviews and what do you look for?', 'Code Quality', 2, 'custom', 45, 'Software Engineer', ARRAY['Code Quality', 'Collaboration']),
('Describe your experience with different programming paradigms.', 'Programming', 2, 'custom', 45, 'Software Engineer', ARRAY['Programming', 'Technical Skills']),
('How do you ensure your code is maintainable and scalable?', 'Code Architecture', 3, 'custom', 60, 'Software Engineer', ARRAY['Code Architecture', 'Technical Skills']),
('Tell me about a complex technical problem you solved recently.', 'Problem Solving', 3, 'custom', 60, 'Software Engineer', ARRAY['Problem Solving', 'Technical Skills']),
('How do you approach debugging complex issues?', 'Debugging', 3, 'custom', 60, 'Software Engineer', ARRAY['Debugging', 'Problem Solving']),
('Describe your experience with different testing strategies.', 'Testing', 2, 'custom', 45, 'Software Engineer', ARRAY['Testing', 'Quality Assurance']),
('How do you stay updated with new technologies and frameworks?', 'Learning', 2, 'custom', 45, 'Software Engineer', ARRAY['Learning', 'Technical Skills']),
('Tell me about a time when you had to refactor legacy code.', 'Refactoring', 3, 'custom', 60, 'Software Engineer', ARRAY['Refactoring', 'Technical Skills']),
('How do you handle performance optimization in your applications?', 'Performance', 3, 'custom', 60, 'Software Engineer', ARRAY['Performance', 'Technical Skills']),
('Describe your experience with DevOps and CI/CD practices.', 'DevOps', 2, 'custom', 45, 'Software Engineer', ARRAY['DevOps', 'Automation']),
('How do you approach API design and what principles do you follow?', 'API Design', 2, 'custom', 45, 'Software Engineer', ARRAY['API Design', 'Technical Skills']),
('Tell me about a time when you had to work with a difficult codebase.', 'Legacy Systems', 3, 'custom', 60, 'Software Engineer', ARRAY['Legacy Systems', 'Problem Solving']),
('How do you handle security considerations in your applications?', 'Security', 3, 'custom', 60, 'Software Engineer', ARRAY['Security', 'Technical Skills']),
('Describe your approach to database design and optimization.', 'Database', 3, 'custom', 60, 'Software Engineer', ARRAY['Database', 'Technical Skills']),
('How do you collaborate with designers and product managers?', 'Collaboration', 2, 'custom', 45, 'Software Engineer', ARRAY['Collaboration', 'Communication']);

-- Insert Data Scientist Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('How do you approach data cleaning and preprocessing?', 'Data Preparation', 2, 'custom', 45, 'Data Scientist', ARRAY['Data Preparation', 'Technical Skills']),
('Describe your experience with different machine learning algorithms.', 'ML Algorithms', 3, 'custom', 60, 'Data Scientist', ARRAY['Machine Learning', 'Technical Skills']),
('How do you validate the accuracy of your models?', 'Model Validation', 3, 'custom', 60, 'Data Scientist', ARRAY['Model Validation', 'Technical Skills']),
('Tell me about a data science project that had significant business impact.', 'Business Impact', 3, 'custom', 60, 'Data Scientist', ARRAY['Business Impact', 'Communication']),
('How do you handle missing data in your datasets?', 'Data Quality', 2, 'custom', 45, 'Data Scientist', ARRAY['Data Quality', 'Technical Skills']),
('Describe your experience with big data technologies.', 'Big Data', 3, 'custom', 60, 'Data Scientist', ARRAY['Big Data', 'Technical Skills']),
('How do you communicate complex data insights to non-technical stakeholders?', 'Communication', 2, 'custom', 45, 'Data Scientist', ARRAY['Communication', 'Data Visualization']),
('Tell me about a time when your model did not perform as expected.', 'Model Failure', 3, 'custom', 60, 'Data Scientist', ARRAY['Model Failure', 'Learning']),
('How do you approach feature engineering for machine learning models?', 'Feature Engineering', 3, 'custom', 60, 'Data Scientist', ARRAY['Feature Engineering', 'Technical Skills']),
('Describe your experience with different data visualization tools.', 'Visualization', 2, 'custom', 45, 'Data Scientist', ARRAY['Data Visualization', 'Technical Skills']),
('How do you ensure your models are ethical and unbiased?', 'Ethics', 3, 'custom', 60, 'Data Scientist', ARRAY['Ethics', 'Responsible AI']),
('Tell me about your experience with A/B testing and statistical analysis.', 'Statistics', 2, 'custom', 45, 'Data Scientist', ARRAY['Statistics', 'Experimentation']),
('How do you approach time series analysis and forecasting?', 'Time Series', 3, 'custom', 60, 'Data Scientist', ARRAY['Time Series', 'Technical Skills']),
('Describe your experience with deep learning frameworks.', 'Deep Learning', 3, 'custom', 60, 'Data Scientist', ARRAY['Deep Learning', 'Technical Skills']),
('How do you stay updated with the latest developments in data science?', 'Learning', 2, 'custom', 45, 'Data Scientist', ARRAY['Learning', 'Industry Knowledge']);

-- Insert UI/UX Designer Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('How do you approach user research and what methods do you use?', 'User Research', 2, 'custom', 45, 'UI/UX Designer', ARRAY['User Research', 'Design Process']),
('Describe your design process from concept to final implementation.', 'Design Process', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Design Process', 'Methodology']),
('How do you balance user needs with business requirements?', 'Balancing Priorities', 3, 'custom', 60, 'UI/UX Designer', ARRAY['Product Strategy', 'User Centered Design']),
('Tell me about a time when you had to redesign an existing product.', 'Redesign', 3, 'custom', 60, 'UI/UX Designer', ARRAY['Redesign', 'Design Process']),
('How do you approach accessibility in your designs?', 'Accessibility', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Accessibility', 'Inclusive Design']),
('Describe your experience with design systems and component libraries.', 'Design Systems', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Design Systems', 'Consistency']),
('How do you validate your design decisions with users?', 'Design Validation', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Design Validation', 'User Testing']),
('Tell me about a time when you had to work within tight design constraints.', 'Constraints', 3, 'custom', 60, 'UI/UX Designer', ARRAY['Constraints', 'Problem Solving']),
('How do you approach mobile-first vs desktop-first design?', 'Responsive Design', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Responsive Design', 'Technical Skills']),
('Describe your experience with prototyping tools and methods.', 'Prototyping', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Prototyping', 'Technical Skills']),
('How do you collaborate with developers to ensure design implementation?', 'Developer Collaboration', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Collaboration', 'Technical Skills']),
('Tell me about a time when user feedback changed your design direction.', 'Feedback Integration', 3, 'custom', 60, 'UI/UX Designer', ARRAY['Feedback Integration', 'Iteration']),
('How do you approach information architecture for complex applications?', 'Information Architecture', 3, 'custom', 60, 'UI/UX Designer', ARRAY['Information Architecture', 'Complexity']),
('Describe your experience with data-driven design decisions.', 'Data-Driven Design', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Data-Driven Design', 'Analytics']),
('How do you stay updated with design trends and best practices?', 'Design Trends', 2, 'custom', 45, 'UI/UX Designer', ARRAY['Design Trends', 'Industry Knowledge']);

-- Insert DevOps Engineer Questions (15 questions)
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
('How do you approach infrastructure as code (IaC)?', 'Infrastructure', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Infrastructure', 'Automation']),
('Describe your experience with containerization and orchestration.', 'Containers', 2, 'custom', 45, 'DevOps Engineer', ARRAY['Containers', 'Technical Skills']),
('How do you implement and maintain CI/CD pipelines?', 'CI/CD', 3, 'custom', 60, 'DevOps Engineer', ARRAY['CI/CD', 'Automation']),
('Tell me about a time when you had to handle a production incident.', 'Incident Management', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Incident Management', 'Problem Solving']),
('How do you approach monitoring and observability in distributed systems?', 'Monitoring', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Monitoring', 'Observability']),
('Describe your experience with cloud platforms and services.', 'Cloud Computing', 2, 'custom', 45, 'DevOps Engineer', ARRAY['Cloud Computing', 'Technical Skills']),
('How do you ensure security in your DevOps practices?', 'Security', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Security', 'DevSecOps']),
('Tell me about a time when you had to scale infrastructure rapidly.', 'Scaling', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Scaling', 'Performance']),
('How do you approach configuration management?', 'Configuration', 2, 'custom', 45, 'DevOps Engineer', ARRAY['Configuration Management', 'Automation']),
('Describe your experience with different automation tools.', 'Automation', 2, 'custom', 45, 'DevOps Engineer', ARRAY['Automation', 'Technical Skills']),
('How do you handle database migrations and deployments?', 'Database Operations', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Database Operations', 'Technical Skills']),
('Tell me about a time when you had to optimize system performance.', 'Performance Optimization', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Performance Optimization', 'Technical Skills']),
('How do you approach disaster recovery and backup strategies?', 'Disaster Recovery', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Disaster Recovery', 'Reliability']),
('Describe your experience with microservices architecture from an operations perspective.', 'Microservices Operations', 3, 'custom', 60, 'DevOps Engineer', ARRAY['Microservices', 'Operations']),
('How do you stay updated with new DevOps tools and practices?', 'Learning', 2, 'custom', 45, 'DevOps Engineer', ARRAY['Learning', 'Industry Knowledge']);
