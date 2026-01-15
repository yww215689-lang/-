
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
  subject?: string; // New field for categorization
  
  // New features
  srs?: SRSData;
  userNotes?: string;
  isFavorite?: boolean; // Collection/Bookmark feature
}

export interface PDFMetadata {
  id: string;
  name: string;
  subject: string;
  size: number;
  addedAt: number;
  order?: number; // New field for sorting
  isFavorite?: boolean; // Collection/Bookmark feature
}

export interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  selectedOption: number;
  timestamp: number;
}

export type ThemeType = 'light' | 'dark' | 'sepia';

export interface AppState {
  questions: Question[];
  history: QuizResult[];
  wrongQuestionIds: string[]; // Set of IDs
  activeSubject?: string; // Persist last selected subject
  pdfs: PDFMetadata[]; // New: List of stored PDFs
  theme?: ThemeType; // Global App Theme
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
  targetSubject: string; // Track which subject this task belongs to
  status: ImportStatus;
  progressMessage: string;
  timestamp: number;
  resultCount?: number; // Final count
  foundCount?: number;  // Real-time count during processing
  errorMessage?: string;
  type?: 'question_import' | 'pdf_storage'; // New field to distinguish task types
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
