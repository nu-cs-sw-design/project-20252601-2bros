// Base URL for the backend API.
// Leave empty by default and prefix explicit `/api/...` paths below.
// If you run the backend on a different origin, set VITE_API_BASE to e.g. `http://127.0.0.1:43210`.
const BASE_URL = import.meta.env.VITE_API_BASE ?? "";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

type DashboardDTO = {
  grades?: {
    assignment: string;
    points: number;
    comment?: string;
    sectionId?: string | null;
    sectionName?: string | null;
    teacherName?: string | null;
  }[];
  attendance?: {
    date: string;
    status: string;
    sectionId?: string | null;
    sectionName?: string | null;
    teacherName?: string | null;
  }[];
  feedback?: { comment: string; createdAt: string }[];
  health?: { notes: string; visitTime: string; studentId?: string; nurseId?: string }[];
};

export type NotificationDTO = {
  message: string;
  createdAt: string;
  type?: string;
};
export type SectionDTO = {
  id: string;
  name?: string;
  term?: string;
  teacherName?: string;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getStudentDashboard(studentId: string) {
  return fetchJson<DashboardDTO>(
    `${BASE_URL}/api/dashboard/student/${studentId}`
  );
}

export function getParentDashboard(parentId: string) {
  return fetchJson<DashboardDTO>(
    `${BASE_URL}/api/dashboard/parent/${parentId}`
  );
}

export function getNotifications(userId: string) {
  return fetchJson<NotificationDTO[]>(
    `${BASE_URL}/api/notifications/${userId}`
  );
}

export function getSections() {
  return fetchJson<SectionDTO[]>(`${BASE_URL}/api/sections`);
}

export function getStudentSections(studentId: string) {
  return fetchJson<SectionDTO[]>(
    `${BASE_URL}/api/students/${studentId}/sections`
  );
}

type ApiResult = { ok: boolean; error?: string };

async function postJson(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const text = await res.text();
    return { ok: false, error: text || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export function enrollStudentInSection(
  studentId: string,
  sectionId: string,
  parentId?: string,
  relationship?: string
) {
  return postJson(`${BASE_URL}/api/enrollments`, {
    studentId,
    sectionId,
    parentId,
    relationship,
  });
}

export function linkParentToStudent(
  parentId: string,
  studentId: string,
  relationship?: string
) {
  return postJson(`${BASE_URL}/api/parent-links`, {
    parentId,
    studentId,
    relationship,
  });
}

export function sendTeacherMessage(
  teacherId: string,
  studentId: string,
  sectionId: string,
  message: string
) {
  return postJson(`${BASE_URL}/api/notifications/teacher-message`, {
    teacherId,
    studentId,
    sectionId,
    message,
  });
}

export function sendTeacherFeedback(
  teacherId: string,
  studentId: string,
  sectionId: string,
  comment: string
) {
  return postJson(`${BASE_URL}/api/feedback`, {
    teacherId,
    studentId,
    sectionId,
    comment,
  });
}

export function teacherUpdateGrade(
  teacherId: string,
  sectionId: string,
  studentId: string,
  assignmentId: string,
  points: number,
  comment?: string
) {
  return postJson(`${BASE_URL}/api/grades`, {
    teacherId,
    sectionId,
    studentId,
    assignmentId,
    points,
    comment,
  });
}

export function teacherMarkAttendance(
  teacherId: string,
  sectionId: string,
  studentId: string,
  date: string,
  status: string,
  reason?: string
) {
  return postJson(`${BASE_URL}/api/attendance`, {
    teacherId,
    sectionId,
    studentId,
    date,
    status,
    reason,
  });
}

export function nurseRecordVisit(
  nurseId: string,
  studentId: string,
  notes: string
) {
  return postJson(`${BASE_URL}/api/nurse-visits`, {
    nurseId,
    studentId,
    notes,
  });
}

export function adminRecordDiscipline(
  adminId: string,
  studentId: string,
  actionType: string,
  notes: string
) {
  return postJson(`${BASE_URL}/api/discipline`, {
    adminId,
    studentId,
    actionType,
    notes,
  });
}

export async function login(username: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `HTTP ${res.status}` } as ApiResult & {
        user?: never;
        token?: never;
      };
    }
    const json = (await res.json()) as {
      token: string;
      user: { id: string; username: string; role: string };
    };
    return { ok: true, token: json.token, user: json.user } as ApiResult &
      typeof json;
  } catch (err) {
    return { ok: false, error: String(err) } as ApiResult & {
      user?: never;
      token?: never;
    };
  }
}
