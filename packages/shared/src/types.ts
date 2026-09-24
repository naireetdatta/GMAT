// ============================================
// GMAT Focus Edition — Core Type Definitions
// ============================================

// ---- Enums ----

export enum Role {
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
  ADMIN = 'ADMIN',
  INSTITUTE = 'INSTITUTE',
}

export enum ExamType {
  PRACTICE = 'PRACTICE',
  MOCK = 'MOCK',
  ADAPTIVE = 'ADAPTIVE',
  RETEST = 'RETEST',
}

export enum ExamStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_BREAK = 'ON_BREAK',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum SectionType {
  QUANTITATIVE = 'QUANTITATIVE',
  VERBAL = 'VERBAL',
  DATA_INSIGHTS = 'DATA_INSIGHTS',
}

export enum SectionStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
}

export enum QuestionType {
  // Quantitative
  PROBLEM_SOLVING = 'PROBLEM_SOLVING',
  // Verbal
  READING_COMPREHENSION = 'READING_COMPREHENSION',
  CRITICAL_REASONING = 'CRITICAL_REASONING',
  // Data Insights
  DATA_SUFFICIENCY = 'DATA_SUFFICIENCY',
  TABLE_ANALYSIS = 'TABLE_ANALYSIS',
  MULTI_SOURCE_REASONING = 'MULTI_SOURCE_REASONING',
  GRAPHICS_INTERPRETATION = 'GRAPHICS_INTERPRETATION',
  TWO_PART_ANALYSIS = 'TWO_PART_ANALYSIS',
}

export enum CRQuestionSubtype {
  ASSUMPTION = 'ASSUMPTION',
  INFERENCE = 'INFERENCE',
  STRENGTHEN = 'STRENGTHEN',
  WEAKEN = 'WEAKEN',
  EVALUATE = 'EVALUATE',
  CONCLUSION = 'CONCLUSION',
}

export enum QuantTopic {
  ARITHMETIC = 'ARITHMETIC',
  ALGEBRA = 'ALGEBRA',
  NUMBER_PROPERTIES = 'NUMBER_PROPERTIES',
  RATIOS = 'RATIOS',
  PERCENTAGES = 'PERCENTAGES',
  STATISTICS = 'STATISTICS',
  WORD_PROBLEMS = 'WORD_PROBLEMS',
}

export enum ErrorType {
  CONCEPTUAL = 'CONCEPTUAL',
  CALCULATION = 'CALCULATION',
  READING = 'READING',
  TIME_PRESSURE = 'TIME_PRESSURE',
  CARELESS = 'CARELESS',
}

export enum FlashcardType {
  CONCEPT = 'CONCEPT',
  FORMULA = 'FORMULA',
  STRATEGY = 'STRATEGY',
  TRAP = 'TRAP',
  VOCABULARY = 'VOCABULARY',
}

export enum TutorMode {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT',
  VISUAL = 'VISUAL',
  COACH = 'COACH',
}

export enum KnowledgeStatus {
  LEARNING = 'LEARNING',
  MASTERED = 'MASTERED',
  FORGOTTEN = 'FORGOTTEN',
}

// ---- Interfaces ----

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionOption {
  id: string;
  label: string; // A, B, C, D, E
  text: string;
}

export interface QuestionExplanation {
  stepByStep: string;
  fasterMethod?: string;
  alternativeMethod?: string;
  wrongOptionExplanations: Record<string, string>; // optionId -> why it's wrong
  commonMistakes: string[];
  relatedConcepts: string[];
}

export interface Question {
  id: string;
  section: SectionType;
  type: QuestionType;
  topic: string;
  subtopic?: string;
  difficulty: number; // 205-805
  stem: string;
  passage?: string;
  options: QuestionOption[];
  correctAnswer: string; // optionId or for DS: "A"|"B"|"C"|"D"|"E"
  explanation: QuestionExplanation;
  timeEstimate: number; // seconds
  psychometricWeight: number;
  // IRT parameters
  irtDifficulty: number; // b parameter
  irtDiscrimination: number; // a parameter
  irtGuessing: number; // c parameter
  // Table Analysis specific
  tableData?: TableData;
  // Graphics Interpretation specific
  chartData?: ChartData;
  // Multi-Source Reasoning specific
  sources?: DataSource[];
  // Two-Part Analysis specific
  twoPartColumns?: string[];
  // CR subtype
  crSubtype?: CRQuestionSubtype;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  sortableColumns: number[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  title: string;
  data: Record<string, unknown>;
  dropdowns: ChartDropdown[];
}

export interface ChartDropdown {
  id: string;
  label: string;
  options: string[];
  correctAnswer: string;
}

export interface DataSource {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'table' | 'chart';
}

export interface ExamConfig {
  type: ExamType;
  sections: SectionConfig[];
  totalTimeMinutes: number;
  breakDurationMinutes: number;
  maxEditsPerSection: number;
}

export interface SectionConfig {
  section: SectionType;
  questionCount: number;
  timeMinutes: number;
  topics: string[];
}

export interface ExamAttempt {
  id: string;
  userId: string;
  type: ExamType;
  status: ExamStatus;
  sectionOrder: SectionType[];
  sections: SectionAttempt[];
  startedAt: Date;
  completedAt?: Date;
  totalScore?: number;
  breakTaken: boolean;
}

export interface SectionAttempt {
  id: string;
  examId: string;
  section: SectionType;
  status: SectionStatus;
  questions: QuestionAttempt[];
  timeRemaining: number;
  sectionScore?: number;
  abilityEstimate: number;
  editsRemaining: number;
}

export interface QuestionAttempt {
  id: string;
  sectionId: string;
  questionId: string;
  order: number;
  userAnswer?: string;
  isCorrect?: boolean;
  isFlagged: boolean;
  isSkipped: boolean;
  timeTaken: number;
  isEdited: boolean;
}

export interface ExamScore {
  totalScore: number; // 205-805
  quantScore: number; // 60-90
  verbalScore: number; // 60-90
  diScore: number; // 60-90
  percentile: number;
}

export interface AnswerKeyEntry {
  questionNumber: number;
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  timeTaken: number;
  difficulty: number;
  isCorrect: boolean;
  topic: string;
  section: SectionType;
}

export interface CoachReportData {
  currentScore: number;
  predictedScore: number;
  targetScore: number;
  weakAreas: TopicAnalysis[];
  strongAreas: TopicAnalysis[];
  studyPlan: StudyRecommendation[];
  timeManagement: TimeManagementAnalysis;
  difficultyAnalysis: DifficultyBreakdown[];
  improvementTimeline: MilestoneEntry[];
}

export interface TopicAnalysis {
  topic: string;
  section: SectionType;
  accuracy: number;
  questionsAttempted: number;
  avgTime: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface StudyRecommendation {
  day: number;
  date: string;
  tasks: StudyTask[];
  estimatedHours: number;
}

export interface StudyTask {
  type: 'practice' | 'review' | 'flashcards' | 'tutor' | 'mock';
  topic: string;
  section: SectionType;
  description: string;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
}

export interface TimeManagementAnalysis {
  avgTimePerQuestion: Record<SectionType, number>;
  timeVsAccuracy: { time: number; accuracy: number }[];
  rushingThreshold: number;
  overthinkingThreshold: number;
}

export interface DifficultyBreakdown {
  level: number;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface MilestoneEntry {
  weekNumber: number;
  expectedScore: number;
  focus: string;
}

// ---- AI Types ----

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIModelConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AITaskAssignment {
  questionGeneration: string;
  validation: string;
  explanation: string;
  tutor: string;
  embedding: string;
}

export interface GeneratedQuestion {
  section: SectionType;
  type: QuestionType;
  topic: string;
  subtopic?: string;
  difficulty: number;
  stem: string;
  passage?: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: QuestionExplanation;
  timeEstimate: number;
  tableData?: TableData;
  chartData?: ChartData;
  sources?: DataSource[];
  crSubtype?: CRQuestionSubtype;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  feedback: string;
}

// ---- Analytics Types ----

export interface DashboardData {
  totalExams: number;
  avgScore: number;
  scoreHistory: { date: string; score: number }[];
  topicPerformance: TopicAnalysis[];
  recentExams: ExamSummary[];
  streakDays: number;
  questionsToday: number;
  accuracyToday: number;
}

export interface ExamSummary {
  id: string;
  type: ExamType;
  totalScore: number;
  completedAt: Date;
  duration: number;
}

export interface AccuracyHeatmapData {
  topic: string;
  difficulty: number;
  accuracy: number;
  count: number;
}
