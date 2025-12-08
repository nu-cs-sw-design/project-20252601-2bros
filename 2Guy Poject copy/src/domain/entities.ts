// Core domain entities as per UML design.
export type Role = 'student' | 'parent' | 'teacher' | 'nurse' | 'administrator';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
}

export interface Student {
  id: string;
  name: string;
}

export interface Parent {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Nurse {
  id: string;
  name: string;
}

export interface Administrator {
  id: string;
  name: string;
}

export interface ParentStudentLink {
  parentId: string;
  studentId: string;
  relationship: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

// School structure
export interface Class {
  id: string;
  name: string;
  subject: string;
}

export interface Section {
  id: string;
  classId: string;
  teacherId: string;
  term: string;
}

export interface Enrollment {
  studentId: string;
  sectionId: string;
}

// Grades & feedback
export interface Assignment {
  id: string;
  sectionId: string;
  title: string;
  maxPoints: number;
  dueDate: string;
}

export interface GradeEntry {
  id: string;
  assignmentId: string;
  studentId: string;
  points: number;
  comment: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  sectionId: string;
  teacherId: string;
  comment: string;
  createdAt: string;
}

// Attendance / health / discipline
export interface AttendanceRecord {
  id: string;
  studentId: string;
  sectionId: string;
  date: string;
  status: string;
  reason: string;
}

export interface NurseVisit {
  id: string;
  studentId: string;
  nurseId: string;
  visitTime: string;
  notes: string;
}

export interface DisciplineAction {
  id: string;
  studentId: string;
  adminId: string;
  date: string;
  actionType: string;
  notes: string;
}

// Notifications and permissions
export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface RolePermission {
  role: Role;
  permission: string;
}

// Simple report
export interface Report {
  title: string;
  content: string;
}
