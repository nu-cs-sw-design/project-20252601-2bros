import path from 'path';
import { DomainEventBus } from './domain/services';
import {
  SqliteAssignmentRepository,
  SqliteAttendanceRepository,
  SqliteDisciplineRepository,
  SqliteFeedbackRepository,
  SqliteGradebookRepository,
  SqliteHealthRepository,
  SqliteNotificationRepository,
  SqliteParentRepository,
  SqliteParentStudentLinkRepository,
  SqliteRolePermissionRepository,
  SqliteSectionRepository,
  SqliteSessionRepository,
  SqliteStudentRepository,
  SqliteTeacherRepository,
  SqliteUserRepository,
} from './datasource/sqlite';
import {
  AttendanceService,
  AuthService,
  DashboardService,
  DisciplineService,
  GradebookService,
  HealthService,
  NotificationService,
} from './domain/services';
import { AttendanceController, DashboardController, GradebookController, NotificationController } from './presentation/controllers';
import { AttendanceView, NotificationView, StudentParentDashboardView, TeacherGradebookView } from './presentation/views';
import { StudentParentRoutingStrategy } from './domain/notificationRouting';
import { PushRefreshStrategy } from './presentation/refresh';
import { KnownDomainEvent } from './domain/events';
import { createSqlJsDatabase, run } from './datasource/sqljs';

async function seed(db: any, persist: () => void) {
  // Clean tables to keep demo idempotent.
  const tablesToClear = [
    'grade_entries',
    'attendance_records',
    'feedback',
    'notifications',
    'nurse_visits',
    'discipline_actions',
    'sessions',
  ];
  tablesToClear.forEach(t => run(db, `DELETE FROM ${t}`));

  run(db, 'INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [
    'teacher-1',
    'teacher',
    'pw',
    'teacher',
  ]);
  run(db, 'INSERT OR IGNORE INTO students (id, name) VALUES (?, ?)', ['student-1', 'Ada Lovelace']);
  run(db, 'INSERT OR IGNORE INTO parents (id, name) VALUES (?, ?)', ['parent-1', 'Parent One']);
  run(db, 'INSERT OR IGNORE INTO parent_student_links (parent_id, student_id, relationship) VALUES (?, ?, ?)', [
    'parent-1',
    'student-1',
    'mother',
  ]);
  run(db, 'INSERT OR IGNORE INTO teachers (id, name) VALUES (?, ?)', ['teacher-1', 'Mr. T']);
  run(db, 'INSERT OR IGNORE INTO classes (id, name, subject) VALUES (?, ?, ?)', ['class-1', 'Math', 'Algebra']);
  run(db, 'INSERT OR IGNORE INTO sections (id, class_id, teacher_id, term) VALUES (?, ?, ?, ?)', [
    'section-1',
    'class-1',
    'teacher-1',
    'Fall',
  ]);
  run(db, 'INSERT OR IGNORE INTO assignments (id, section_id, title, max_points, due_date) VALUES (?, ?, ?, ?, ?)', [
    'assignment-1',
    'section-1',
    'Essay',
    100,
    new Date().toISOString(),
  ]);
  run(db, 'INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)', ['teacher', 'grade:update']);
  persist();
}

async function main() {
  const dbPath = path.join(__dirname, '..', 'data', 'app.db');
  const { db, persist } = await createSqlJsDatabase(dbPath);
  await seed(db, persist);

  const bus = new DomainEventBus();
  const users = new SqliteUserRepository(db);
  const sessions = new SqliteSessionRepository(db);
  const students = new SqliteStudentRepository(db);
  const parents = new SqliteParentRepository(db);
  const parentLinks = new SqliteParentStudentLinkRepository(db);
  const sections = new SqliteSectionRepository(db);
  const assignments = new SqliteAssignmentRepository(db);
  const gradebook = new SqliteGradebookRepository(db);
  const attendance = new SqliteAttendanceRepository(db);
  const feedback = new SqliteFeedbackRepository(db);
  const health = new SqliteHealthRepository(db);
  const discipline = new SqliteDisciplineRepository(db);
  const notifications = new SqliteNotificationRepository(db);
  const rolePermissions = new SqliteRolePermissionRepository(db);

  const authService = new AuthService(users, sessions);
  const gradebookService = new GradebookService(gradebook, assignments, feedback, bus);
  const attendanceService = new AttendanceService(attendance, bus);
  const healthService = new HealthService(health, bus);
  const disciplineService = new DisciplineService(discipline, bus);
  const notificationService = new NotificationService(notifications, bus, new StudentParentRoutingStrategy(parentLinks));
  const dashboardService = new DashboardService(
    students,
    parents,
    parentLinks,
    sections,
    gradebook,
    attendance,
    feedback,
    health,
    discipline,
  );

  const gradebookController = new GradebookController(gradebookService, new TeacherGradebookView());
  const attendanceController = new AttendanceController(attendanceService, new AttendanceView());
  const dashboardController = new DashboardController(
    dashboardService,
    bus,
    new StudentParentDashboardView(),
    new PushRefreshStrategy(),
  );
  const notificationController = new NotificationController(notificationService, new NotificationView());

  const forwardToNotifications = (event: KnownDomainEvent) => notificationService.notify(event);
  bus.subscribe('GradesUpdated', forwardToNotifications);
  bus.subscribe('AttendanceUpdated', forwardToNotifications);
  bus.subscribe('NurseVisitLogged', forwardToNotifications);
  bus.subscribe('DisciplineRecorded', forwardToNotifications);

  await authService.authenticate('teacher', 'pw');
  await gradebookController.updateGrade('assignment-1', 'student-1', 95, 'Nice work!');
  await gradebookController.addFeedback('student-1', 'section-1', 'Keep it up');
  await attendanceController.markAttendance('section-1', 'student-1', new Date().toISOString(), 'Present');
  await dashboardController.loadStudentDashboard('student-1');
  await notificationController.listNotifications('student-1');
  await notificationController.listNotifications('parent-1');

  persist();
  console.log('SQLite demo complete at', dbPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
