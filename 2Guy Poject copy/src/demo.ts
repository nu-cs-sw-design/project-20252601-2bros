import { DomainEventBus } from './domain/services';
import {
  InMemoryAssignmentRepository,
  InMemoryAttendanceRepository,
  InMemoryDisciplineRepository,
  InMemoryFeedbackRepository,
  InMemoryGradebookRepository,
  InMemoryHealthRepository,
  InMemoryNotificationRepository,
  InMemoryParentRepository,
  InMemoryParentStudentLinkRepository,
  InMemoryRolePermissionRepository,
  InMemorySectionRepository,
  InMemorySessionRepository,
  InMemoryStudentRepository,
  InMemoryTeacherRepository,
  InMemoryUserRepository,
} from './datasource/memory';
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

async function main() {
  const bus = new DomainEventBus();

  // Repositories
  const users = new InMemoryUserRepository([{ id: 'teacher-1', username: 'teacher', passwordHash: 'pw', role: 'teacher' }]);
  const sessions = new InMemorySessionRepository();
  const students = new InMemoryStudentRepository([{ id: 'student-1', name: 'Ada Lovelace' }]);
  const parents = new InMemoryParentRepository([{ id: 'parent-1', name: 'Parent One' }]);
  const parentLinks = new InMemoryParentStudentLinkRepository([{ parentId: 'parent-1', studentId: 'student-1', relationship: 'mother' }]);
  const sections = new InMemorySectionRepository([{ id: 'section-1', classId: 'class-1', teacherId: 'teacher-1', term: 'Fall' }]);
  const assignments = new InMemoryAssignmentRepository([{ id: 'assignment-1', sectionId: 'section-1', title: 'Essay', maxPoints: 100, dueDate: new Date().toISOString() }]);
  const gradebook = new InMemoryGradebookRepository();
  const attendance = new InMemoryAttendanceRepository();
  const feedback = new InMemoryFeedbackRepository();
  const health = new InMemoryHealthRepository();
  const discipline = new InMemoryDisciplineRepository();
  const notifications = new InMemoryNotificationRepository();
  const rolePermissions = new InMemoryRolePermissionRepository([{ role: 'teacher', permission: 'grade:update' }]);

  // Services
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

  // Controllers + views
  const gradebookController = new GradebookController(gradebookService, new TeacherGradebookView());
  const attendanceController = new AttendanceController(attendanceService, new AttendanceView());
  const dashboardController = new DashboardController(
    dashboardService,
    bus,
    new StudentParentDashboardView(),
    new PushRefreshStrategy(),
  );
  const notificationController = new NotificationController(notificationService, new NotificationView());

  // Subscribe notifications to domain events
  const forwardToNotifications = (event: KnownDomainEvent) => notificationService.notify(event);
  bus.subscribe('GradesUpdated', forwardToNotifications);
  bus.subscribe('AttendanceUpdated', forwardToNotifications);
  bus.subscribe('NurseVisitLogged', forwardToNotifications);
  bus.subscribe('DisciplineRecorded', forwardToNotifications);

  // Demo actions
  await authService.authenticate('teacher', 'pw');
  await gradebookController.updateGrade('assignment-1', 'student-1', 95, 'Nice work!');
  await gradebookController.addFeedback('student-1', 'section-1', 'Keep it up');
  await attendanceController.markAttendance('section-1', 'student-1', new Date().toISOString(), 'Present');
  await dashboardController.loadStudentDashboard('student-1');
  await notificationController.listNotifications('student-1');
  await notificationController.listNotifications('parent-1');

  console.log('Demo complete');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
