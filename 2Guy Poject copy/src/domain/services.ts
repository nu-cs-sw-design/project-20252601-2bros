import {
  AttendanceRecord,
  DisciplineAction,
  Feedback,
  GradeEntry,
  Notification,
  NurseVisit,
  Report,
  RolePermission,
  Session,
  User,
} from "./entities";
import { KnownDomainEvent } from "./events";
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
} from "../datasource/repositories";
import { ExportStrategy, SearchStrategy } from "./strategies";
import { randomUUID } from "crypto";
import { NotificationRoutingStrategy } from "./notificationRouting";

// Simple in-memory domain event bus.
export class DomainEventBus {
  private handlers: Record<string, Array<(event: KnownDomainEvent) => void>> =
    {};

  subscribe(
    eventType: KnownDomainEvent["type"],
    handler: (event: KnownDomainEvent) => void
  ) {
    this.handlers[eventType] = this.handlers[eventType] ?? [];
    this.handlers[eventType].push(handler);
  }

  publish(event: KnownDomainEvent) {
    this.handlers[event.type]?.forEach((handler) => handler(event));
  }
}

export class AuthService {
  constructor(
    private users: UserRepository,
    private sessions: SessionRepository
  ) {}

  async authenticate(
    username: string,
    password: string
  ): Promise<Session | null> {
    const user = await this.users.findByUsername(username);
    if (!user) return null;
    // Password check placeholder; replace with a real hash verify.
    if (user.passwordHash !== password) return null;
    const session: Session = {
      token: randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    };
    await this.sessions.save(session);
    return session;
  }

  async getCurrentUser(token: string): Promise<User | null> {
    const session = await this.sessions.findByToken(token);
    if (!session) return null;
    return this.users.findById(session.userId);
  }

  async logout(token: string): Promise<void> {
    await this.sessions.delete(token);
  }
}

export class GradebookService {
  constructor(
    private grades: GradebookRepository,
    private assignments: AssignmentRepository,
    private feedbackRepo: FeedbackRepository,
    private events: DomainEventBus
  ) {}

  getGradebookForSection(sectionId: string, _teacherId: string) {
    return this.grades.findGradesForSection(sectionId);
  }

  async updateGrade(
    assignmentId: string,
    studentId: string,
    points: number,
    comment: string
  ) {
    const grade: GradeEntry = {
      id: randomUUID(),
      assignmentId,
      studentId,
      points,
      comment,
    };
    await this.grades.saveGrade(grade);
    const assignment = await this.assignments.findById(assignmentId);
    this.events.publish({
      type: "GradesUpdated",
      occurredAt: new Date().toISOString(),
      payload: { studentId, sectionId: assignment?.sectionId ?? "" },
    });
  }

  async addFeedback(
    studentId: string,
    sectionId: string,
    comment: string,
    teacherId: string
  ) {
    const feedback: Feedback = {
      id: randomUUID(),
      studentId,
      sectionId,
      teacherId,
      comment,
      createdAt: new Date().toISOString(),
    };
    await this.feedbackRepo.saveFeedback(feedback);
    this.events.publish({
      type: "GradesUpdated",
      occurredAt: new Date().toISOString(),
      payload: { studentId, sectionId },
    });
  }

  getGradesForStudent(studentId: string) {
    return this.grades.findGradesForStudent(studentId);
  }
}

export class AttendanceService {
  constructor(
    private attendanceRepo: AttendanceRepository,
    private events: DomainEventBus
  ) {}

  getAttendanceForStudent(studentId: string) {
    return this.attendanceRepo.findByStudentId(studentId);
  }

  async markAttendance(
    sectionId: string,
    studentId: string,
    date: string,
    status: string,
    reason: string
  ) {
    const record: AttendanceRecord = {
      id: randomUUID(),
      sectionId,
      studentId,
      date,
      status,
      reason,
    };
    await this.attendanceRepo.saveAttendance(record);
    this.events.publish({
      type: "AttendanceUpdated",
      occurredAt: new Date().toISOString(),
      payload: { studentId },
    });
  }
}

export class HealthService {
  constructor(
    private healthRepo: HealthRepository,
    private events: DomainEventBus
  ) {}

  getHealthVisits(studentId: string) {
    return this.healthRepo.findVisitsByStudentId(studentId);
  }

  async recordVisit(studentId: string, nurseId: string, notes: string) {
    const visit: NurseVisit = {
      id: randomUUID(),
      studentId,
      nurseId,
      visitTime: new Date().toISOString(),
      notes,
    };
    await this.healthRepo.saveVisit(visit);
    this.events.publish({
      type: "NurseVisitLogged",
      occurredAt: new Date().toISOString(),
      payload: { studentId },
    });
  }
}

export class DisciplineService {
  constructor(
    private disciplineRepo: DisciplineRepository,
    private events: DomainEventBus
  ) {}

  getDiscipline(studentId: string) {
    return this.disciplineRepo.findActionsByStudentId(studentId);
  }

  async recordDiscipline(
    studentId: string,
    adminId: string,
    actionType: string,
    notes: string
  ) {
    const action: DisciplineAction = {
      id: randomUUID(),
      studentId,
      adminId,
      date: new Date().toISOString(),
      actionType,
      notes,
    };
    await this.disciplineRepo.saveAction(action);
    this.events.publish({
      type: "DisciplineRecorded",
      occurredAt: new Date().toISOString(),
      payload: { studentId },
    });
  }
}

export class AccessControlService {
  constructor(
    private rolePermissions: RolePermissionRepository,
    private users: UserRepository
  ) {}

  async authorize(userId: string, permission: string, _resourceId?: string) {
    const user = await this.users.findById(userId);
    if (!user) return false;
    const perms = await this.rolePermissions.findByRole(user.role);
    return perms.some((p: RolePermission) => p.permission === permission);
  }

  permissionsForUser(userId: string) {
    return this.users
      .findById(userId)
      .then((user) => (user ? this.rolePermissions.findByRole(user.role) : []));
  }
}

export class NotificationService {
  constructor(
    private notifications: NotificationRepository,
    private events: DomainEventBus,
    private routing: NotificationRoutingStrategy
  ) {}

  async notify(event: KnownDomainEvent) {
    const recipients = await this.routing.recipientsFor(event);
    const message = this.buildMessage(event);
    for (const userId of recipients) {
      const notification: Notification = {
        id: randomUUID(),
        userId,
        type: event.type,
        message,
        read: false,
        createdAt: event.occurredAt,
      };
      await this.notifications.save(notification);
    }
  }

  async notifyTeacherMessage(
    teacherId: string,
    studentId: string,
    sectionId: string,
    message: string
  ) {
    const routing: any = this.routing as any;
    const recipients =
      typeof routing.recipientsForStudentAndParents === "function"
        ? await routing.recipientsForStudentAndParents(studentId)
        : [studentId];
    for (const userId of recipients) {
      const notification: Notification = {
        id: randomUUID(),
        userId,
        type: "TeacherMessage",
        message: `From ${teacherId} (section ${sectionId}): ${message}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await this.notifications.save(notification);
    }
  }

  async notifyFeedbackToStudent(
    teacherId: string,
    studentId: string,
    sectionId: string,
    comment: string
  ) {
    // Send feedback ONLY to student, not parents
    const notification: Notification = {
      id: randomUUID(),
      userId: studentId,
      type: "FeedbackFromTeacher",
      message: `From teacher-${teacherId} (section ${sectionId}): ${comment}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await this.notifications.save(notification);
  }

  private buildMessage(event: KnownDomainEvent): string {
    switch (event.type) {
      case "GradesUpdated":
        return `Grades updated for student ${event.payload.studentId}`;
      case "AttendanceUpdated":
        return `Attendance updated for student ${event.payload.studentId}`;
      case "NurseVisitLogged":
        return `New nurse visit logged for student ${event.payload.studentId}`;
      case "DisciplineRecorded":
        return `Discipline action recorded for student ${event.payload.studentId}`;
      default:
        return "New update available";
    }
  }

  list(userId: string) {
    return this.notifications.findByUserId(userId);
  }

  markRead(notificationId: string) {
    return this.notifications.markRead(notificationId);
  }
}

export class DashboardService {
  constructor(
    private students: StudentRepository,
    private parents: ParentRepository,
    private parentLinks: ParentStudentLinkRepository,
    private sections: SectionRepository,
    private grades: GradebookRepository,
    private attendance: AttendanceRepository,
    private feedback: FeedbackRepository,
    private health: HealthRepository,
    private discipline: DisciplineRepository
  ) {}

  async buildDashboardForStudent(studentId: string) {
    const [
      student,
      enrollmentSections,
      grades,
      attendanceRecords,
      feedback,
      healthVisits,
      disciplineActions,
    ] = await Promise.all([
      this.students.findById(studentId),
      this.sections.findByStudentId(studentId),
      this.grades.findGradesForStudent(studentId),
      this.attendance.findByStudentId(studentId),
      this.feedback.findByStudentId(studentId),
      this.health.findVisitsByStudentId(studentId),
      this.discipline.findActionsByStudentId(studentId),
    ]);
    return {
      studentName: student?.name ?? "Unknown",
      classesSummary: enrollmentSections,
      gradesSummary: grades,
      attendanceSummary: attendanceRecords,
      feedbackSummary: feedback,
      healthSummary: healthVisits,
      disciplineSummary: disciplineActions,
    };
  }

  async buildDashboardForParent(parentId: string) {
    const links = await this.parentLinks.findByParentId(parentId);
    const dashboards = await Promise.all(
      links.map((link) => this.buildDashboardForStudent(link.studentId))
    );
    return dashboards;
  }
}

export class SearchService<TCriteria, TItem> {
  constructor(private strategy: SearchStrategy<TCriteria, TItem>) {}
  search(criteria: TCriteria, dataset: TItem[]) {
    return dataset.filter((item) => this.strategy.match(item, criteria));
  }
}

export class ExportService<TData> {
  constructor(private strategy: ExportStrategy<TData>) {}
  exportReport(_reportType: string, data: TData) {
    return this.strategy.render(data);
  }
}

export class AuditLogService {
  constructor(private audit: AuditLogRepository) {}
  append(event: KnownDomainEvent) {
    return this.audit.append(event);
  }
}

export class EnrollmentService {
  constructor(
    private enrollments: EnrollmentRepository,
    private parentLinks: ParentStudentLinkRepository
  ) {}

  async enrollStudentInSection(
    studentId: string,
    sectionId: string,
    parentId?: string,
    relationship?: string
  ) {
    await this.enrollments.save({ studentId, sectionId });
    if (parentId) {
      await this.parentLinks.save({
        parentId,
        studentId,
        relationship: relationship ?? "parent",
      });
    }
  }
}

// Facade to orchestrate report building, exporting, and optional notification.
export class ReportingFacade<TData> {
  constructor(
    private dashboardService: DashboardService,
    private notificationService: NotificationService
  ) {}

  async buildAndExport(
    reportType: string,
    context: { studentId?: string; parentId?: string },
    exportStrategy: ExportStrategy<TData>
  ) {
    let data: unknown;
    if (reportType === "student-dashboard" && context.studentId) {
      data = await this.dashboardService.buildDashboardForStudent(
        context.studentId
      );
    } else if (reportType === "parent-dashboard" && context.parentId) {
      data = await this.dashboardService.buildDashboardForParent(
        context.parentId
      );
    } else {
      data = {};
    }
    const exporter = new ExportService(exportStrategy);
    const rendered = exporter.exportReport(reportType, data as TData);
    if (context.studentId) {
      await this.notificationService.notify({
        type: "GradesUpdated",
        occurredAt: new Date().toISOString(),
        payload: { studentId: context.studentId, sectionId: "" },
      });
    }
    return rendered;
  }
}
