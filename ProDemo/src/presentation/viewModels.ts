export interface DashboardViewModel {
  studentName: string;
  classesSummary: unknown;
  gradesSummary: unknown;
  attendanceSummary: unknown;
  feedbackSummary: unknown;
  disciplineSummary: unknown;
  healthSummary: unknown;
}

export interface GradebookViewModel {
  sectionName: string;
  assignmentsSummary: unknown;
  studentGradesSummary: unknown;
}

export interface AttendanceViewModel {
  studentName: string;
  recordsSummary: unknown;
}

export interface HealthViewModel {
  studentName: string;
  visitsSummary: unknown;
}

export interface DisciplineViewModel {
  studentName: string;
  actionsSummary: unknown;
}

export interface NotificationViewModel {
  notificationsSummary: unknown;
}
