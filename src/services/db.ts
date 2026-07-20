import Dexie, { type EntityTable } from 'dexie';

export interface Coaching {
  id?: number;
  name: string;
}

export interface TestType {
  id?: number;
  name: string;
  isFullyDependent?: boolean;
  isPartiallyDependent?: boolean;
}

export interface Subject {
  id?: number;
  name: string;
}

export interface Topic {
  id?: number;
  subjectId: number;
  name: string;
}

export interface Chapter {
  id?: number;
  subjectId: number;
  name: string;
}

export interface Tag {
  id?: number;
  name: string;
  subjectId?: number;
  color?: string;
}

export interface Status {
  id?: number;
  name: string;
  color: string;
  isOutcome: boolean;
}

export interface Test {
  id?: number;
  coachingId: number;
  testTypeId: number;
  subjectId?: number;
  topicId?: number;
  questionsCount: number;
  maxMarks: number;
  marksObtained: number;
  timeTaken?: string;
  link?: string;
  createdAt: number;
  isImportant?: boolean;
  tagIds?: number[];
}


export interface Question {
  id?: number;
  testId: number;
  questionNumber: number;
  notes?: string;
  link?: string;
  questionImage?: Blob;
  answerImage?: Blob;
  statusIds: number[];
  tagIds: number[];
  topicIds?: number[];
  subjectId?: number;
  isFavorite: boolean;
  testDate: number;

  // New features
  customTitle?: string;
  questionText?: string;
  questionTextBottom?: string;
  optionsType?: 'MCQ' | 'NAT' | 'NONE';
  selectedOptions?: string[];
  numericalAnswer?: number;
  customBlocks?: {
    id: string;
    title: string;
    content: string;
    contentBottom?: string;
    image?: Blob;
  }[];
}

export interface PracticeSession {
  id?: number;
  name: string;
  tagId?: number;
  createdAt: number;
  updatedAt: number;
  status: 'InProgress' | 'Completed';
  timeElapsed: number;
  timeLimit?: number;
  marksObtained: number;
  maxMarks: number;
  responses: {
    questionId: number;
    status: 'not_visited' | 'not_answered' | 'answered' | 'review' | 'answered_review';
    selectedOptions?: string[];
    numericalAnswer?: number;
    isCorrect?: boolean;
    marks?: number;
  }[];
  allowNegativeMarking: boolean;
}

const db = new Dexie('TestFlixDB') as Dexie & {
  coachings: EntityTable<Coaching, 'id'>;
  testTypes: EntityTable<TestType, 'id'>;
  subjects: EntityTable<Subject, 'id'>;
  topics: EntityTable<Topic, 'id'>;
  chapters: EntityTable<Chapter, 'id'>;
  tags: EntityTable<Tag, 'id'>;
  statuses: EntityTable<Status, 'id'>;
  tests: EntityTable<Test, 'id'>;
  questions: EntityTable<Question, 'id'>;
  practiceSessions: EntityTable<PracticeSession, 'id'>;
};

db.version(1).stores({
  coachings: '++id, &name',
  testTypes: '++id, &name',
  subjects: '++id, &name',
  topics: '++id, subjectId, name',
  chapters: '++id, subjectId, name',
  tags: '++id, name, subjectId',
  statuses: '++id, &name',
  tests: '++id, coachingId, testTypeId, subjectId, createdAt',
  questions: '++id, testId, questionNumber, isFavorite, testDate, *statusIds, *tagIds'
});

db.version(2).stores({
  tests: '++id, coachingId, testTypeId, subjectId, createdAt, isImportant',
});

db.version(3).stores({
  practiceSessions: '++id, status, createdAt, tagId'
});

export { db };
