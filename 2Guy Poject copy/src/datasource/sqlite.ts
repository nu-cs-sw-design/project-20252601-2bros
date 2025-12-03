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
import {
  AssignmentRepository,
  AttendanceRepository,
  AuditLogRepository,
  ClassRepository,
  DisciplineRepository,
  EnrollmentRepository,
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
} from './repositories';
// @ts-ignore sql.js types are bundled; ts-node needs suppression in this setup
import { Database } from 'sql.js';
import { queryAll, queryGet, run } from './sqljs';

export class SqliteUserRepository implements UserRepository {
  constructor(private db: Database) {}
  findByUsername(username: string) {
    const row = queryGet<any>(
      this.db,
      'SELECT id, username, password_hash as passwordHash, role FROM users WHERE username = ?',
      [username],
    );
    return Promise.resolve(row as User | null);
  }
  findById(id: string) {
    const row = queryGet<any>(
      this.db,
      'SELECT id, username, password_hash as passwordHash, role FROM users WHERE id = ?',
      [id],
    );
    return Promise.resolve(row as User | null);
  }
}

export class SqliteStudentRepository implements StudentRepository {
  constructor(private db: Database) {}
  findById(id: string) {
    return Promise.resolve(queryGet<Student>(this.db, 'SELECT * FROM students WHERE id = ?', [id]));
  }
}

export class SqliteParentRepository implements ParentRepository {
  constructor(private db: Database) {}
  findById(id: string) {
    return Promise.resolve(queryGet<Parent>(this.db, 'SELECT * FROM parents WHERE id = ?', [id]));
  }
  findByUserId(userId: string) {
    return Promise.resolve(queryGet<Parent>(this.db, 'SELECT * FROM parents WHERE id = ?', [userId]));
  }
}

export class SqliteParentStudentLinkRepository implements ParentStudentLinkRepository {
  constructor(private db: Database) {}
  findByParentId(parentId: string) {
    const rows = queryAll<any>(this.db, 'SELECT * FROM parent_student_links WHERE parent_id = ?', [parentId]);
    return Promise.resolve(rows.map(r => ({ parentId: r.parent_id, studentId: r.student_id, relationship: r.relationship })));
  }
  findByStudentId(studentId: string) {
    const rows = queryAll<any>(this.db, 'SELECT * FROM parent_student_links WHERE student_id = ?', [studentId]);
    return Promise.resolve(rows.map(r => ({ parentId: r.parent_id, studentId: r.student_id, relationship: r.relationship })));
  }
  save(link: ParentStudentLink) {
    // Avoid duplicate parent/student links.
    run(this.db, 'INSERT OR IGNORE INTO parent_student_links (parent_id, student_id, relationship) VALUES (?, ?, ?)', [
      link.parentId,
      link.studentId,
      link.relationship,
    ]);
    return Promise.resolve();
  }
}

export class SqliteTeacherRepository implements TeacherRepository {
  constructor(private db: Database) {}
  findById(id: string) {
    return Promise.resolve(queryGet<Teacher>(this.db, 'SELECT * FROM teachers WHERE id = ?', [id]));
  }
}

export class SqliteClassRepository implements ClassRepository {
  constructor(private db: Database) {}
  findById(id: string) {
    return Promise.resolve(queryGet<Class>(this.db, 'SELECT * FROM classes WHERE id = ?', [id]));
  }
}

export class SqliteSectionRepository implements SectionRepository {
  constructor(private db: Database) {}
  findById(id: string) {
    return Promise.resolve(queryGet<Section>(this.db, 'SELECT * FROM sections WHERE id = ?', [id]));
  }
  findByStudentId(studentId: string) {
    const sql = `
      SELECT s.* FROM sections s
      JOIN enrollments e ON e.section_id = s.id
      WHERE e.student_id = ?`;
    return Promise.resolve(queryAll<Section>(this.db, sql, [studentId]));
  }
  findByTeacherId(teacherId: string) {
    return Promise.resolve(queryAll<Section>(this.db, 'SELECT * FROM sections WHERE teacher_id = ?', [teacherId]));
  }
}

export class SqliteEnrollmentRepository implements EnrollmentRepository {
  constructor(private db: Database) {}
  findByStudentId(studentId: string) {
    return Promise.resolve(queryAll<Enrollment>(this.db, 'SELECT * FROM enrollments WHERE student_id = ?', [studentId]));
  }
  save(enrollment: Enrollment) {
    // Use OR IGNORE so repeated enrollment for the same student/section
    // does not throw a UNIQUE constraint error.
    run(this.db, 'INSERT OR IGNORE INTO enrollments (student_id, section_id) VALUES (?, ?)', [
      enrollment.studentId,
      enrollment.sectionId,
    ]);
    return Promise.resolve();
  }
}

export class SqliteAssignmentRepository implements AssignmentRepository {
  constructor(private db: Database) {}
  findBySectionId(sectionId: string) {
    return Promise.resolve(queryAll<Assignment>(this.db, 'SELECT * FROM assignments WHERE section_id = ?', [sectionId]));
  }
  findById(id: string) {
    return Promise.resolve(queryGet<Assignment>(this.db, 'SELECT * FROM assignments WHERE id = ?', [id]));
  }
}

export class SqliteGradebookRepository implements GradebookRepository {
  constructor(private db: Database) {}
  findGradesForSection(sectionId: string) {
    const sql = `
      SELECT g.* FROM grade_entries g
      JOIN assignments a ON a.id = g.assignment_id
      WHERE a.section_id = ?`;
    return Promise.resolve(queryAll<GradeEntry>(this.db, sql, [sectionId]));
  }
  findGradesForStudent(studentId: string) {
    return Promise.resolve(queryAll<GradeEntry>(this.db, 'SELECT * FROM grade_entries WHERE student_id = ?', [studentId]));
  }
  saveGrade(gradeEntry: GradeEntry) {
    run(
      this.db,
      'INSERT INTO grade_entries (id, assignment_id, student_id, points, comment) VALUES (?, ?, ?, ?, ?)',
      [gradeEntry.id, gradeEntry.assignmentId, gradeEntry.studentId, gradeEntry.points, gradeEntry.comment],
    );
    return Promise.resolve();
  }
}

export class SqliteFeedbackRepository implements FeedbackRepository {
  constructor(private db: Database) {}
  findByStudentId(studentId: string) {
    return Promise.resolve(queryAll<Feedback>(this.db, 'SELECT * FROM feedback WHERE student_id = ?', [studentId]));
  }
  saveFeedback(feedback: Feedback) {
    run(
      this.db,
      'INSERT INTO feedback (id, student_id, section_id, teacher_id, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [feedback.id, feedback.studentId, feedback.sectionId, feedback.teacherId, feedback.comment, feedback.createdAt],
    );
    return Promise.resolve();
  }
}

export class SqliteAttendanceRepository implements AttendanceRepository {
  constructor(private db: Database) {}
  findByStudentId(studentId: string) {
    return Promise.resolve(
      queryAll<AttendanceRecord>(this.db, 'SELECT * FROM attendance_records WHERE student_id = ?', [studentId]),
    );
  }
  saveAttendance(record: AttendanceRecord) {
    run(
      this.db,
      'INSERT INTO attendance_records (id, student_id, section_id, date, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
      [record.id, record.studentId, record.sectionId, record.date, record.status, record.reason],
    );
    return Promise.resolve();
  }
}

export class SqliteHealthRepository implements HealthRepository {
  constructor(private db: Database) {}
  findVisitsByStudentId(studentId: string) {
    return Promise.resolve(queryAll<NurseVisit>(this.db, 'SELECT * FROM nurse_visits WHERE student_id = ?', [studentId]));
  }
  saveVisit(visit: NurseVisit) {
    run(
      this.db,
      'INSERT INTO nurse_visits (id, student_id, nurse_id, visit_time, notes) VALUES (?, ?, ?, ?, ?)',
      [visit.id, visit.studentId, visit.nurseId, visit.visitTime, visit.notes],
    );
    return Promise.resolve();
  }
}

export class SqliteDisciplineRepository implements DisciplineRepository {
  constructor(private db: Database) {}
  findActionsByStudentId(studentId: string) {
    return Promise.resolve(
      queryAll<DisciplineAction>(this.db, 'SELECT * FROM discipline_actions WHERE student_id = ?', [studentId]),
    );
  }
  saveAction(action: DisciplineAction) {
    run(
      this.db,
      'INSERT INTO discipline_actions (id, student_id, admin_id, date, action_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [action.id, action.studentId, action.adminId, action.date, action.actionType, action.notes],
    );
    return Promise.resolve();
  }
}

export class SqliteNotificationRepository implements NotificationRepository {
  constructor(private db: Database) {}
  findByUserId(userId: string) {
    return Promise.resolve(queryAll<Notification>(this.db, 'SELECT * FROM notifications WHERE user_id = ?', [userId]));
  }
  save(notification: Notification) {
    run(
      this.db,
      'INSERT INTO notifications (id, user_id, type, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [notification.id, notification.userId, notification.type, notification.message, notification.read ? 1 : 0, notification.createdAt],
    );
    return Promise.resolve();
  }
  markRead(notificationId: string) {
    run(this.db, 'UPDATE notifications SET read = 1 WHERE id = ?', [notificationId]);
    return Promise.resolve();
  }
}

export class SqliteRolePermissionRepository implements RolePermissionRepository {
  constructor(private db: Database) {}
  findByRole(role: string) {
    return Promise.resolve(queryAll<RolePermission>(this.db, 'SELECT * FROM role_permissions WHERE role = ?', [role]));
  }
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private db: Database) {}
  save(session: Session) {
    run(this.db, 'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
      session.token,
      session.userId,
      session.expiresAt,
    ]);
    return Promise.resolve();
  }
  findByToken(token: string) {
    const row = queryGet<any>(
      this.db,
      'SELECT token, user_id as userId, expires_at as expiresAt FROM sessions WHERE token = ?',
      [token],
    );
    return Promise.resolve(row as Session | null);
  }
  delete(token: string) {
    run(this.db, 'DELETE FROM sessions WHERE token = ?', [token]);
    return Promise.resolve();
  }
}

export class SqliteAuditLogRepository implements AuditLogRepository {
  constructor(private db: Database) {}
  append(event: unknown) {
    run(
      this.db,
      'INSERT INTO notifications (id, user_id, type, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['audit-' + Date.now(), 'audit', 'AuditEvent', JSON.stringify(event), 0, new Date().toISOString()],
    );
    return Promise.resolve();
  }
}
