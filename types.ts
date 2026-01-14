export interface SRSData {
  easeFactor: number;
  interval: number; // in days
  repetitions: number;
  dueDate: number; // timestamp
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  sourceFile?: string;
  addedAt: number;
  
  // New features
  srs?: SRSData;
  userNotes?: string;
}

export interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  selectedOption: number;
  timestamp: number;
}

export interface AppState {
  questions: Question[];
  history: QuizResult[];
  wrongQuestionIds: string[]; // Set of IDs
}

export enum QuizMode {
  RANDOM = 'RANDOM',
  SEQUENTIAL = 'SEQUENTIAL',
  MISTAKES = 'MISTAKES',
  REVIEW = 'REVIEW', // SRS Review Mode
  EXAM = 'EXAM' // Mock Exam Mode
}

export interface ParsedQuestionRaw {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export type ImportStatus = 'processing' | 'completed' | 'error';

export interface ImportTask {
  id: string;
  fileName: string;
  status: ImportStatus;
  progressMessage: string;
  timestamp: number;
  resultCount?: number; // Final count
  foundCount?: number;  // Real-time count during processing
  errorMessage?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
