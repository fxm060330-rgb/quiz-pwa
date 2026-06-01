export interface Question {
  id: string;
  type: "single" | "multi" | "judge";
  question: string;
  options: string[];
  answer: string;
  analysis: string;
  chapter: string;
  difficulty: number; // 1=easy 2=medium 3=hard
}

export interface AnswerRecord {
  id?: number;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  mode: "practice" | "exam";
  timestamp: number;
  examId?: string;
  userName?: string;
}

export interface Favorite {
  questionId: string;
  timestamp: number;
}

export interface ExamConfig {
  questionCount: number;
  timeLimit: number; // minutes
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  startTime: number;
  endTime?: number;
  score?: number;
  questionIds: string[];
  answers: Record<string, string>;
  currentIndex?: number;
  remainingSeconds?: number;
  status?: "in_progress" | "finished";
}

export interface ChapterProgress {
  chapter: string;
  total: number;
  completed: number;
  correct: number;
}

export interface Stats {
  totalPracticed: number;
  totalCorrect: number;
  correctRate: number;
  streak: number;
  todayCount: number;
  chapterProgress: ChapterProgress[];
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  password: string;
  creatorName: string;
  createdAt: number;
}

export interface GroupMember {
  id?: number;
  groupId: string;
  name: string;
  avatar: string;
  role: "admin" | "member";
  joinedAt: number;
}
