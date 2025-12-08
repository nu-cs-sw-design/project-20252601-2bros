import {
  Assignment,
  AttendanceRecord,
  DisciplineAction,
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
  Enrollment,
} from '../domain/entities';
import {
  AssignmentRepository,
  AttendanceRepository,
  AuditLogRepository,
  DisciplineRepository,
  FeedbackRepository,
  GradebookRepository,
  HealthRepository,
  NotificationRepository,
  ParentRepository,
  ParentStudentLinkRepository,
  RolePermissionRepository,
  SectionRepository,
  SessionRepository,
  StudentRepository,
  TeacherRepository,
  UserRepository,
  EnrollmentRepository,
} from './repositories';

// Simple in-memory repository implementations for demo/testing.
export class InMemoryUserRepository implements UserRepository {
  constructor(private items: User[] = []) {}
  findByUsername(username: string) {
    return Promise.resolve(this.items.find(u => u.username === username) ?? null);
  }
  findById(id: string) {
    return Promise.resolve(this.items.find(u => u.id === id) ?? null);
  }
}

export class InMemoryStudentRepository implements StudentRepository {
  constructor(private items: Student[] = []) {}
  findById(id: string) {
    return Promise.resolve(this.items.find(s => s.id === id) ?? null);
  }
}

export class InMemoryParentRepository implements ParentRepository {
  constructor(private items: Parent[] = []) {}
  findById(id: string) {
    return Promise.resolve(this.items.find(p => p.id === id) ?? null);
  }
  findByUserId(userId: string) {
    return Promise.resolve(this.items.find(p => p.id === userId) ?? null);
  }
}

export class InMemoryParentStudentLinkRepository implements ParentStudentLinkRepository {
  constructor(private items: ParentStudentLink[] = []) {}
  findByParentId(parentId: string) {
    return Promise.resolve(this.items.filter(l => l.parentId === parentId));
  }
  findByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(l => l.studentId === studentId));
  }
  save(link: ParentStudentLink) {
    this.items.push(link);
    return Promise.resolve();
  }
}

export class InMemoryTeacherRepository implements TeacherRepository {
  constructor(private items: Teacher[] = []) {}
  findById(id: string) {
    return Promise.resolve(this.items.find(t => t.id === id) ?? null);
  }
}

export class InMemorySectionRepository implements SectionRepository {
  constructor(private items: Section[] = []) {}
  findById(id: string) {
    return Promise.resolve(this.items.find(s => s.id === id) ?? null);
  }
  findByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(s => s.id === studentId));
  }
  findByTeacherId(teacherId: string) {
    return Promise.resolve(this.items.filter(s => s.teacherId === teacherId));
  }
}

export class InMemoryAssignmentRepository implements AssignmentRepository {
  constructor(private items: Assignment[] = []) {}
  findBySectionId(sectionId: string) {
    return Promise.resolve(this.items.filter(a => a.sectionId === sectionId));
  }
  findById(id: string) {
    return Promise.resolve(this.items.find(a => a.id === id) ?? null);
  }
}

export class InMemoryGradebookRepository implements GradebookRepository {
  constructor(private items: GradeEntry[] = []) {}
  findGradesForSection(sectionId: string) {
    return Promise.resolve(this.items.filter(g => g.assignmentId === sectionId));
  }
  findGradesForStudent(studentId: string) {
    return Promise.resolve(this.items.filter(g => g.studentId === studentId));
  }
  saveGrade(gradeEntry: GradeEntry) {
    this.items.push(gradeEntry);
    return Promise.resolve();
  }
}

export class InMemoryEnrollmentRepository implements EnrollmentRepository {
  constructor(private items: Enrollment[] = []) {}
  findByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(e => e.studentId === studentId));
  }
  save(enrollment: Enrollment) {
    this.items.push(enrollment);
    return Promise.resolve();
  }
}

export class InMemoryFeedbackRepository implements FeedbackRepository {
  constructor(private items: Feedback[] = []) {}
  findByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(f => f.studentId === studentId));
  }
  saveFeedback(feedback: Feedback) {
    this.items.push(feedback);
    return Promise.resolve();
  }
}

export class InMemoryAttendanceRepository implements AttendanceRepository {
  constructor(private items: AttendanceRecord[] = []) {}
  findByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(a => a.studentId === studentId));
  }
  saveAttendance(record: AttendanceRecord) {
    this.items.push(record);
    return Promise.resolve();
  }
}

export class InMemoryHealthRepository implements HealthRepository {
  constructor(private items: NurseVisit[] = []) {}
  findVisitsByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(h => h.studentId === studentId));
  }
  saveVisit(visit: NurseVisit) {
    this.items.push(visit);
    return Promise.resolve();
  }
}

export class InMemoryDisciplineRepository implements DisciplineRepository {
  constructor(private items: DisciplineAction[] = []) {}
  findActionsByStudentId(studentId: string) {
    return Promise.resolve(this.items.filter(d => d.studentId === studentId));
  }
  saveAction(action: DisciplineAction) {
    this.items.push(action);
    return Promise.resolve();
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  constructor(private items: Notification[] = []) {}
  findByUserId(userId: string) {
    return Promise.resolve(this.items.filter(n => n.userId === userId));
  }
  save(notification: Notification) {
    this.items.push(notification);
    return Promise.resolve();
  }
  markRead(notificationId: string) {
    const notification = this.items.find(n => n.id === notificationId);
    if (notification) notification.read = true;
    return Promise.resolve();
  }
}

export class InMemoryRolePermissionRepository implements RolePermissionRepository {
  constructor(private items: RolePermission[] = []) {}
  findByRole(role: string) {
    return Promise.resolve(this.items.filter(p => p.role === role));
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private items: Session[] = [];
  save(session: Session) {
    this.items.push(session);
    return Promise.resolve();
  }
  findByToken(token: string) {
    return Promise.resolve(this.items.find(s => s.token === token) ?? null);
  }
  delete(token: string) {
    this.items = this.items.filter(s => s.token !== token);
    return Promise.resolve();
  }
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private events: unknown[] = [];
  append(event: unknown) {
    this.events.push(event);
    return Promise.resolve();
  }
}
