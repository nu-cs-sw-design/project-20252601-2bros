import {
  AttendanceService,
  AuthService,
  DashboardService,
  DisciplineService,
  DomainEventBus,
  ExportService,
  GradebookService,
  HealthService,
  NotificationService,
  SearchService,
} from '../domain/services';
import { RefreshStrategy } from './refresh';
import { AttendanceViewModel, DashboardViewModel, DisciplineViewModel, GradebookViewModel, HealthViewModel, NotificationViewModel } from './viewModels';

export class DashboardController {
  private lastContext: { kind: 'student' | 'parent'; id: string } | null = null;
  constructor(
    private dashboardService: DashboardService,
    private events: DomainEventBus,
    private view: { showDashboard(vm: DashboardViewModel): void; showError(message: string): void },
    private refreshStrategy?: RefreshStrategy<typeof view, DashboardController>,
  ) {
    this.events.subscribe('GradesUpdated', () => this.refresh());
    this.events.subscribe('AttendanceUpdated', () => this.refresh());
    this.events.subscribe('NurseVisitLogged', () => this.refresh());
    this.events.subscribe('DisciplineRecorded', () => this.refresh());
  }

  async loadStudentDashboard(studentId: string) {
    try {
      this.lastContext = { kind: 'student', id: studentId };
      const vm = (await this.dashboardService.buildDashboardForStudent(studentId)) as DashboardViewModel;
      this.view.showDashboard(vm);
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async loadParentDashboard(parentId: string) {
    try {
      this.lastContext = { kind: 'parent', id: parentId };
      const vm = (await this.dashboardService.buildDashboardForParent(parentId)) as unknown as DashboardViewModel;
      this.view.showDashboard(vm);
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  reloadLastContext() {
    if (!this.lastContext) return;
    if (this.lastContext.kind === 'student') {
      this.loadStudentDashboard(this.lastContext.id);
    } else {
      this.loadParentDashboard(this.lastContext.id);
    }
  }

  private refresh() {
    this.refreshStrategy?.refresh(this.view, this);
  }
}

export class GradebookController {
  constructor(
    private gradebookService: GradebookService,
    private view: {
      showGradebook(vm: GradebookViewModel): void;
      showSuccess(message: string): void;
      showError(message: string): void;
    },
  ) {}

  async viewGradebook(sectionId: string, teacherId: string) {
    try {
      const grades = await this.gradebookService.getGradebookForSection(sectionId, teacherId);
      this.view.showGradebook({
        sectionName: sectionId,
        assignmentsSummary: [],
        studentGradesSummary: grades,
      });
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async updateGrade(assignmentId: string, studentId: string, points: number, comment: string) {
    try {
      await this.gradebookService.updateGrade(assignmentId, studentId, points, comment);
      this.view.showSuccess('Grade saved');
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async addFeedback(studentId: string, sectionId: string, comment: string) {
    try {
      await this.gradebookService.addFeedback(studentId, sectionId, comment, 'teacher-id');
      this.view.showSuccess('Feedback added');
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}

export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private view: { showAttendance(vm: AttendanceViewModel): void; showError(message: string): void },
  ) {}

  async viewAttendance(studentId: string) {
    try {
      const records = await this.attendanceService.getAttendanceForStudent(studentId);
      this.view.showAttendance({ studentName: studentId, recordsSummary: records });
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async markAttendance(sectionId: string, studentId: string, date: string, status: string) {
    try {
      await this.attendanceService.markAttendance(sectionId, studentId, date, status, '');
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}

export class HealthController {
  constructor(
    private healthService: HealthService,
    private view: { showHealth(vm: HealthViewModel): void; showError(message: string): void },
  ) {}

  async viewHealthVisits(studentId: string) {
    try {
      const visits = await this.healthService.getHealthVisits(studentId);
      this.view.showHealth({ studentName: studentId, visitsSummary: visits });
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async recordVisit(studentId: string, nurseId: string, notes: string) {
    try {
      await this.healthService.recordVisit(studentId, nurseId, notes);
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}

export class DisciplineController {
  constructor(
    private disciplineService: DisciplineService,
    private view: { showDiscipline(vm: DisciplineViewModel): void; showError(message: string): void },
  ) {}

  async viewDiscipline(studentId: string) {
    try {
      const actions = await this.disciplineService.getDiscipline(studentId);
      this.view.showDiscipline({ studentName: studentId, actionsSummary: actions });
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async recordDiscipline(studentId: string, adminId: string, action: string, notes: string) {
    try {
      await this.disciplineService.recordDiscipline(studentId, adminId, action, notes);
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}

export class SearchController<TCriteria, TItem> {
  constructor(
    private searchService: SearchService<TCriteria, TItem>,
    private view: { showSearchResults(results: TItem[]): void; showError(message: string): void },
  ) {}

  // Aligns with UML: search(criteria, strategyKind)
  // while still accepting a dataset to search over.
  search(criteria: TCriteria, strategyKind: string, dataset: TItem[]) {
    try {
      // Current implementation ignores strategyKind because the
      // strategy is supplied via SearchService construction.
      const results = this.searchService.search(criteria, dataset);
      this.view.showSearchResults(results);
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}

export class ExportController<TData> {
  constructor(
    private exportService: ExportService<TData>,
    private view: { showExport(data: string | Uint8Array): void; showError(message: string): void },
  ) {}

  exportReport(reportType: string, exportKind: TData) {
    try {
      const result = this.exportService.exportReport(reportType, exportKind);
      this.view.showExport(result);
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}

export class AuthController {
  constructor(
    private authService: AuthService,
    private view: { showLogin(): void; showLoginError(message: string): void },
  ) {}

  async login(username: string, password: string) {
    const session = await this.authService.authenticate(username, password);
    if (!session) {
      this.view.showLoginError('Invalid credentials');
    }
    return session;
  }

  // UML shows `logout()` with no parameters; keep token optional
  // so existing usages can still pass it explicitly.
  logout(token?: string) {
    if (!token) return Promise.resolve();
    return this.authService.logout(token);
  }
}

export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private view: { showNotifications(vm: NotificationViewModel): void; showError(message: string): void },
  ) {}

  async listNotifications(userId: string) {
    try {
      const notifications = await this.notificationService.list(userId);
      this.view.showNotifications({ notificationsSummary: notifications });
    } catch (err) {
      this.view.showError(String(err));
    }
  }

  async markNotificationRead(notificationId: string) {
    try {
      await this.notificationService.markRead(notificationId);
    } catch (err) {
      this.view.showError(String(err));
    }
  }
}
