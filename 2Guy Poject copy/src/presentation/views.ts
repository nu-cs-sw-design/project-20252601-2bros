import {
  AttendanceViewModel,
  DashboardViewModel,
  DisciplineViewModel,
  GradebookViewModel,
  HealthViewModel,
  NotificationViewModel,
} from "./viewModels";

export class StudentParentDashboardView {
  showDashboard(vm: DashboardViewModel) {
    console.log("Dashboard", vm);
  }
  showError(message: string) {
    console.error("Dashboard error", message);
  }
}

export class TeacherGradebookView {
  showGradebook(vm: GradebookViewModel) {
    console.log("Gradebook", vm);
  }
  showSuccess(message: string) {
    console.log(message);
  }
  showError(message: string) {
    console.error("Gradebook error", message);
  }
}

export class AttendanceView {
  showAttendance(vm: AttendanceViewModel) {
    console.log("Attendance", vm);
  }
  showError(message: string) {
    console.error("Attendance error", message);
  }
}

export class HealthView {
  showHealth(vm: HealthViewModel) {
    console.log("Health visits", vm);
  }
  showError(message: string) {
    console.error("Health error", message);
  }
}

export class DisciplineView {
  showDiscipline(vm: DisciplineViewModel) {
    console.log("Discipline", vm);
  }
  showError(message: string) {
    console.error("Discipline error", message);
  }
}

export class LoginView {
  showLogin() {
    console.log("Show login screen");
  }
  showLoginError(message: string) {
    console.error("Login error", message);
  }
}

export class NotificationView {
  showNotifications(vm: NotificationViewModel) {
    console.log("Notifications", vm);
  }
  showError(message: string) {
    console.error("Notifications error", message);
  }
}
