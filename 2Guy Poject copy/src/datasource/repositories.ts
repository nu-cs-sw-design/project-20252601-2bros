import {
  Assignment,
  AttendanceRecord,
  Class,
  DisciplineAction,
  Enrollment,
  Feedback,
  GradeEntry,
  Notification,
  NurseVisit,
  Parent,
  ParentStudentLink,
  RolePermission,
  Section,
  Session,
  Student,
  Teacher,
  User,
} from '../domain/entities';

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export interface StudentRepository {
  findById(id: string): Promise<Student | null>;
}

export interface ParentRepository {
  findById(id: string): Promise<Parent | null>;
  findByUserId(userId: string): Promise<Parent | null>;
}

export interface ParentStudentLinkRepository {
  findByParentId(parentId: string): Promise<ParentStudentLink[]>;
  findByStudentId(studentId: string): Promise<ParentStudentLink[]>;
  save(link: ParentStudentLink): Promise<void>;
}

export interface TeacherRepository {
  findById(id: string): Promise<Teacher | null>;
}

export interface ClassRepository {
  findById(id: string): Promise<Class | null>;
}

export interface SectionRepository {
  findById(id: string): Promise<Section | null>;
  findByStudentId(studentId: string): Promise<Section[]>;
  findByTeacherId(teacherId: string): Promise<Section[]>;
}

export interface EnrollmentRepository {
  findByStudentId(studentId: string): Promise<Enrollment[]>;
  save(enrollment: Enrollment): Promise<void>;
}

export interface AssignmentRepository {
  findBySectionId(sectionId: string): Promise<Assignment[]>;
  findById(id: string): Promise<Assignment | null>;
}

export interface GradebookRepository {
  findGradesForSection(sectionId: string): Promise<GradeEntry[]>;
  findGradesForStudent(studentId: string): Promise<GradeEntry[]>;
  saveGrade(gradeEntry: GradeEntry): Promise<void>;
}

export interface FeedbackRepository {
  findByStudentId(studentId: string): Promise<Feedback[]>;
  saveFeedback(feedback: Feedback): Promise<void>;
}

export interface AttendanceRepository {
  findByStudentId(studentId: string): Promise<AttendanceRecord[]>;
  saveAttendance(record: AttendanceRecord): Promise<void>;
}

export interface HealthRepository {
  findVisitsByStudentId(studentId: string): Promise<NurseVisit[]>;
  saveVisit(visit: NurseVisit): Promise<void>;
}

export interface DisciplineRepository {
  findActionsByStudentId(studentId: string): Promise<DisciplineAction[]>;
  saveAction(action: DisciplineAction): Promise<void>;
}

export interface NotificationRepository {
  findByUserId(userId: string): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  markRead(notificationId: string): Promise<void>;
}

export interface RolePermissionRepository {
  findByRole(role: string): Promise<RolePermission[]>;
}

export interface SessionRepository {
  save(session: Session): Promise<void>;
  findByToken(token: string): Promise<Session | null>;
  delete(token: string): Promise<void>;
}

export interface AuditLogRepository {
  append(event: unknown): Promise<void>;
}
