// ============================================
// GMAT Focus Edition Constants
// ============================================

import { SectionType, QuestionType, QuantTopic, type SectionConfig, type ExamConfig, ExamType } from './types';

// ---- Exam Structure ----

export const GMAT_SECTIONS: SectionConfig[] = [
  {
    section: SectionType.QUANTITATIVE,
    questionCount: 21,
    timeMinutes: 45,
    topics: Object.values(QuantTopic),
  },
  {
    section: SectionType.VERBAL,
    questionCount: 23,
    timeMinutes: 45,
    topics: ['READING_COMPREHENSION', 'CRITICAL_REASONING'],
  },
  {
    section: SectionType.DATA_INSIGHTS,
    questionCount: 20,
    timeMinutes: 45,
    topics: [
      'DATA_SUFFICIENCY',
      'TABLE_ANALYSIS',
      'MULTI_SOURCE_REASONING',
      'GRAPHICS_INTERPRETATION',
      'TWO_PART_ANALYSIS',
    ],
  },
];

export const GMAT_EXAM_CONFIG: ExamConfig = {
  type: ExamType.MOCK,
  sections: GMAT_SECTIONS,
  totalTimeMinutes: 135, // 3 × 45
  breakDurationMinutes: 10,
  maxEditsPerSection: 3,
};

export const TOTAL_QUESTIONS = 64; // 21 + 23 + 20

// ---- Scoring ----

export const SCORE_RANGE = {
  total: { min: 205, max: 805, increment: 10 },
  section: { min: 60, max: 90, increment: 1 },
};

export const DIFFICULTY_LEVELS = [205, 305, 405, 505, 605, 705, 805] as const;

export const DIFFICULTY_LABELS: Record<number, string> = {
  205: 'Foundational',
  305: 'Basic',
  405: 'Intermediate',
  505: 'Proficient',
  605: 'Advanced',
  705: 'Expert',
  805: 'Elite',
};

// ---- IRT Constants ----

export const IRT_CONFIG = {
  initialTheta: 0, // Starting ability estimate (average)
  thetaMin: -3.0,
  thetaMax: 3.0,
  priorMean: 0,
  priorSD: 1,
  convergenceThreshold: 0.01,
  maxIterations: 100,
  semThreshold: 0.3, // Standard Error of Measurement threshold
  maxExposureRate: 0.3, // Sympson-Hetter
};

// Map theta to GMAT score
export const THETA_TO_SCORE_MAP = {
  total: { thetaMin: -3.0, thetaMax: 3.0, scoreMin: 205, scoreMax: 805 },
  section: { thetaMin: -3.0, thetaMax: 3.0, scoreMin: 60, scoreMax: 90 },
};

// ---- Question Type Config ----

export const QUESTION_TYPES_BY_SECTION: Record<SectionType, QuestionType[]> = {
  [SectionType.QUANTITATIVE]: [QuestionType.PROBLEM_SOLVING],
  [SectionType.VERBAL]: [
    QuestionType.READING_COMPREHENSION,
    QuestionType.CRITICAL_REASONING,
  ],
  [SectionType.DATA_INSIGHTS]: [
    QuestionType.DATA_SUFFICIENCY,
    QuestionType.TABLE_ANALYSIS,
    QuestionType.MULTI_SOURCE_REASONING,
    QuestionType.GRAPHICS_INTERPRETATION,
    QuestionType.TWO_PART_ANALYSIS,
  ],
};

// ---- Topic Hierarchy ----

export const QUANT_TOPICS = {
  ARITHMETIC: {
    label: 'Arithmetic',
    subtopics: ['Integers', 'Fractions', 'Decimals', 'Exponents', 'Roots', 'Order of Operations'],
  },
  ALGEBRA: {
    label: 'Algebra',
    subtopics: ['Linear Equations', 'Quadratic Equations', 'Inequalities', 'Functions', 'Sequences'],
  },
  NUMBER_PROPERTIES: {
    label: 'Number Properties',
    subtopics: ['Divisibility', 'Primes', 'Factors', 'Multiples', 'Remainders', 'Even/Odd'],
  },
  RATIOS: {
    label: 'Ratios & Proportions',
    subtopics: ['Simple Ratios', 'Combined Ratios', 'Direct/Inverse Proportion', 'Mixtures'],
  },
  PERCENTAGES: {
    label: 'Percentages',
    subtopics: ['Percent Change', 'Profit & Loss', 'Simple Interest', 'Compound Interest', 'Discounts'],
  },
  STATISTICS: {
    label: 'Statistics',
    subtopics: ['Mean', 'Median', 'Mode', 'Range', 'Standard Deviation', 'Sets & Counting'],
  },
  WORD_PROBLEMS: {
    label: 'Word Problems',
    subtopics: ['Rate/Work', 'Distance/Speed/Time', 'Mixtures', 'Probability', 'Combinatorics', 'Overlapping Sets'],
  },
};

export const VERBAL_TOPICS = {
  READING_COMPREHENSION: {
    label: 'Reading Comprehension',
    subtopics: ['Main Idea', 'Detail', 'Inference', 'Tone/Attitude', 'Structure', 'Application'],
  },
  CRITICAL_REASONING: {
    label: 'Critical Reasoning',
    subtopics: ['Assumption', 'Strengthen', 'Weaken', 'Inference', 'Evaluate', 'Conclusion'],
  },
};

export const DI_TOPICS = {
  DATA_SUFFICIENCY: {
    label: 'Data Sufficiency',
    subtopics: ['Algebra DS', 'Number Properties DS', 'Statistics DS', 'Arithmetic DS'],
  },
  TABLE_ANALYSIS: {
    label: 'Table Analysis',
    subtopics: ['Sorting', 'Filtering', 'Calculation', 'Comparison'],
  },
  MULTI_SOURCE_REASONING: {
    label: 'Multi-Source Reasoning',
    subtopics: ['Cross-Reference', 'Contradiction', 'Inference'],
  },
  GRAPHICS_INTERPRETATION: {
    label: 'Graphics Interpretation',
    subtopics: ['Bar Charts', 'Line Graphs', 'Scatter Plots', 'Pie Charts'],
  },
  TWO_PART_ANALYSIS: {
    label: 'Two-Part Analysis',
    subtopics: ['Quantitative TPA', 'Verbal TPA', 'Mixed TPA'],
  },
};

// ---- Timer Constants ----

export const TIMER_WARNING_THRESHOLDS = {
  cautionMinutes: 5,  // Yellow warning
  urgentMinutes: 1,   // Red pulsing warning
};

// ---- Spaced Repetition ----

export const LEITNER_INTERVALS = {
  1: 1,    // Box 1: Review tomorrow
  2: 3,    // Box 2: Review in 3 days
  3: 7,    // Box 3: Review in 7 days
  4: 14,   // Box 4: Review in 14 days
  5: 30,   // Box 5: Review in 30 days
};

export const SM2_DEFAULTS = {
  easeFactor: 2.5,
  minEaseFactor: 1.3,
  interval: 1,
  repetitions: 0,
};

// ---- Data Sufficiency Answer Choices ----

export const DS_ANSWER_CHOICES = [
  { id: 'A', text: 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.' },
  { id: 'B', text: 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.' },
  { id: 'C', text: 'BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.' },
  { id: 'D', text: 'EACH statement ALONE is sufficient.' },
  { id: 'E', text: 'Statements (1) and (2) TOGETHER are NOT sufficient.' },
];
