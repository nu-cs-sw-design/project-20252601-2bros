import "./App.css";
import { useEffect, useState } from "react";
import {
  enrollStudentInSection,
  getNotifications,
  getParentDashboard,
  getStudentDashboard,
  linkParentToStudent,
  sendTeacherMessage,
  sendTeacherFeedback,
  getSections,
  getStudentSections,
  teacherMarkAttendance,
  teacherUpdateGrade,
  nurseRecordVisit,
  adminRecordDiscipline,
  login,
  setAuthToken,
} from "./api/client";
import type { SectionDTO } from "./api/client";

type DashboardCard = {
  title: string;
  items: { label: string; value: string }[];
};

type GradeEntry = {
  assignment: string;
  points: number;
  comment: string;
  sectionId?: string | null;
  sectionName?: string | null;
  teacherName?: string | null;
};
type AttendanceEntry = {
  date: string;
  status: string;
  sectionId?: string | null;
  sectionName?: string | null;
  teacherName?: string | null;
};
type FeedbackEntry = { comment: string; createdAt: string };
type NotificationEntry = { message: string; createdAt: string };

type Tab =
  | "student"
  | "parent"
  | "teacher"
  | "nurse"
  | "admin"
  | "notifications";

type CurrentUser = {
  id: string;
  username: string;
  role: "student" | "parent" | "teacher" | "nurse" | "administrator";
};

function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("student");
  const [studentDashboard, setStudentDashboard] = useState<DashboardCard[]>([]);
  const [parentDashboard, setParentDashboard] = useState<DashboardCard[]>([]);
  const [feedbackView, setFeedbackView] = useState<FeedbackEntry[]>([]);
  const [notificationsView, setNotificationsView] = useState<
    NotificationEntry[]
  >([]);
  const [parentNotificationsView, setParentNotificationsView] = useState<
    NotificationEntry[]
  >([]);
  const [nurseMessages, setNurseMessages] = useState<
    { notes: string; visitTime: string }[]
  >([]);
  const [studentGrades, setStudentGrades] = useState<GradeEntry[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceEntry[]>(
    []
  );
  // start with nothing selected so tests run against a blank DB
  const [gradeAssignmentId, setGradeAssignmentId] = useState("");
  const [gradePoints, setGradePoints] = useState<number | "">("");
  const [teacherStatus, setTeacherStatus] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  // no default section selected — keep initial state empty
  const [sectionId, setSectionId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  // teacher messages start empty by default (no hard-coded text)
  const [teacherMessage, setTeacherMessage] = useState("");
  const [nurseId, setNurseId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [studentSections, setStudentSections] = useState<SectionDTO[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingParent, setLoadingParent] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;
    const nextStudentId = user.role === "student" ? user.id : studentId;
    const nextParentId = user.role === "parent" ? user.id : parentId;
    const nextTeacherId = user.role === "teacher" ? user.id : teacherId;
    const nextNurseId = user.role === "nurse" ? user.id : nurseId;
    const nextAdminId = user.role === "administrator" ? user.id : adminId;

    setStudentId(nextStudentId);
    setParentId(nextParentId);
    setTeacherId(nextTeacherId);
    setNurseId(nextNurseId);
    setAdminId(nextAdminId);

    loadSections();
    if (nextStudentId) {
      loadStudentSections(nextStudentId);
      loadStudent(nextStudentId);
    }
    if (nextParentId) {
      loadParent(nextParentId);
    }
    // Load notifications for the logged-in user (student, parent, or teacher).
    loadNotifications();
  }, [user]);

  // Subscribe to SSE for real-time updates
  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    // Get backend URL from env or construct from window.location
    const backendUrl =
      import.meta.env.VITE_API_BASE ||
      `http://${window.location.hostname}:43210`;
    const eventSource = new EventSource(`${backendUrl}/api/events/${userId}`);

    const handleEvent = (event: Event) => {
      const messageEvent = event as MessageEvent;
      try {
        const data = JSON.parse(messageEvent.data);
        const { type } = data;

        // Refresh dashboards when relevant events arrive
        if (
          type === "GradesUpdated" ||
          type === "AttendanceUpdated" ||
          type === "NurseVisitLogged" ||
          type === "DisciplineRecorded" ||
          type === "TeacherMessage"
        ) {
          // Refresh student dashboard
          if (user.role === "student") {
            loadStudent(user.id);
          }
          // Refresh parent dashboard
          if (user.role === "parent") {
            loadParent(user.id);
          }
          // Refresh teacher view if applicable
          if (user.role === "teacher" && studentId) {
            loadStudent(studentId);
          }
          // Refresh notifications
          loadNotifications();
        }
      } catch (err) {
        console.error("Error parsing SSE event:", err);
      }
    };

    eventSource.addEventListener("message", handleEvent);

    // Cleanup on unmount
    return () => {
      eventSource.removeEventListener("message", handleEvent);
      eventSource.close();
    };
  }, [user, studentId, parentId]);

  // Auto-select first section if available and none selected
  useEffect(() => {
    if (sections.length > 0 && !sectionId) {
      setSectionId(sections[0].id);
    }
  }, [sections, sectionId]);

  const loadStudent = async (overrideId?: string) => {
    const id = overrideId ?? studentId;
    if (!id) return;
    setLoadingStudent(true);
    const data = await getStudentDashboard(id);
    setLoadingStudent(false);
    if (!data) return;
    const grades = (data.grades ?? []).map((g) => ({
      assignment: g.assignment,
      points: g.points,
      // Do not surface inline grade comments here; teacher messages
      // and feedback are shown via notifications / feedback instead.
      comment: "",
      sectionId: g.sectionId,
      sectionName: g.sectionName,
      teacherName: g.teacherName,
    }));
    const attendance = (data.attendance ?? []).map((a) => ({
      date: a.date,
      status: a.status,
      sectionId: a.sectionId,
      sectionName: a.sectionName,
      teacherName: a.teacherName,
    }));
    const feedback = (data.feedback ?? []).map((f) => ({
      comment: f.comment,
      createdAt: f.createdAt,
    }));
    setStudentGrades(grades);
    setStudentAttendance(attendance);
    setFeedbackView(feedback);

    // Group by section so students see which class each grade/record belongs to.
    const sectionCards: Record<
      string,
      {
        grades: { label: string; value: string }[];
        attendance: { label: string; value: string }[];
        title: string;
      }
    > = {};

    const resolveSectionTitle = (
      sectionId?: string | null,
      sectionName?: string | null,
      teacherName?: string | null
    ) => {
      // Fallback label when we cannot resolve a class/section.
      if (!sectionId && !sectionName) return "Ungrouped (no section)";
      const fromState = sectionId
        ? sections.find((s) => s.id === sectionId)
        : undefined;
      const name =
        fromState?.name ?? sectionName ?? sectionId ?? "Ungrouped (no section)";
      const teacher = fromState?.teacherName ?? teacherName;
      return teacher ? `${name} — ${teacher}` : name;
    };

    grades.forEach((g) => {
      const key = String(g.sectionId ?? g.sectionName ?? "default");
      const entry =
        sectionCards[key] ??
        (sectionCards[key] = {
          grades: [],
          attendance: [],
          title: resolveSectionTitle(g.sectionId, g.sectionName, g.teacherName),
        });
      entry.grades.push({
        label: g.assignment,
        value: `${g.points}`,
      });
    });

    attendance.forEach((a) => {
      const key = String(a.sectionId ?? a.sectionName ?? "default");
      const entry =
        sectionCards[key] ??
        (sectionCards[key] = {
          grades: [],
          attendance: [],
          title: resolveSectionTitle(a.sectionId, a.sectionName, a.teacherName),
        });
      entry.attendance.push({
        label: a.date,
        value: a.status,
      });
    });

    const cards: DashboardCard[] = Object.values(sectionCards).flatMap(
      (section) => {
        const result: DashboardCard[] = [];
        if (section.grades.length) {
          result.push({
            title: `Grades — ${section.title}`,
            items: section.grades,
          });
        }
        // Only show an attendance card when there are actual records
        // so we avoid empty “Attendance — …” boxes.
        if (section.attendance.length) {
          result.push({
            title: `Attendance — ${section.title}`,
            items: section.attendance,
          });
        }
        return result;
      }
    );

    setStudentDashboard(cards.length ? cards : []);
    // Dashboard feedback currently mocked; leave as-is until backend support is added.
  };

  const loadParent = async (overrideId?: string) => {
    const id = overrideId ?? parentId;
    if (!id) return;
    setLoadingParent(true);
    const data = await getParentDashboard(id);
    setLoadingParent(false);
    if (!data) return;
    const grades = data.grades ?? [];
    const attendance = data.attendance ?? [];
     const health = data.health ?? [];

    const sectionCards: Record<
      string,
      {
        grades: { label: string; value: string }[];
        attendance: { label: string; value: string }[];
        title: string;
      }
    > = {};

    const resolveSectionTitle = (
      sectionId?: string | null,
      sectionName?: string | null,
      teacherName?: string | null
    ) => {
      if (!sectionId && !sectionName) return "Ungrouped (no section)";
      const fromState = sectionId
        ? sections.find((s) => s.id === sectionId)
        : undefined;
      const name =
        fromState?.name ?? sectionName ?? sectionId ?? "Ungrouped (no section)";
      const teacher = fromState?.teacherName ?? teacherName;
      return teacher ? `${name} — ${teacher}` : name;
    };

    grades.forEach((g) => {
      const key = String(g.sectionId ?? g.sectionName ?? "default");
      const entry =
        sectionCards[key] ??
        (sectionCards[key] = {
          grades: [],
          attendance: [],
          title: resolveSectionTitle(g.sectionId, g.sectionName, g.teacherName),
        });
      entry.grades.push({
        label: g.assignment,
        // Show numeric grade only; teacher messages are shown separately.
        value: `${g.points}`,
      });
    });

    attendance.forEach((a) => {
      const key = String(a.sectionId ?? a.sectionName ?? "default");
      const entry =
        sectionCards[key] ??
        (sectionCards[key] = {
          grades: [],
          attendance: [],
          title: resolveSectionTitle(a.sectionId, a.sectionName, a.teacherName),
        });
      entry.attendance.push({
        label: a.date,
        value: a.status,
      });
    });

    const cards: DashboardCard[] = Object.values(sectionCards).flatMap(
      (section) => {
        const result: DashboardCard[] = [];
        if (section.grades.length) {
          result.push({
            title: `Grades — ${section.title}`,
            items: section.grades,
          });
        }
        if (section.attendance.length) {
          result.push({
            title: `Attendance — ${section.title}`,
            items: section.attendance,
          });
        }
        return result;
      }
    );

    setParentDashboard(cards.length ? cards : []);
    setNurseMessages(
      health.map((h) => ({
        notes: h.notes,
        visitTime: h.visitTime,
      }))
    );
    const parentNotes = await getNotifications(id);
    if (parentNotes) {
      setParentNotificationsView(parentNotes);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    let targetId: string | null = null;
    if (user?.role === "student") {
      targetId = user.id;
    } else if (user?.role === "parent") {
      targetId = user.id;
    } else if (user?.role === "teacher") {
      targetId = user.id;
    }
    if (!targetId) {
      setLoadingNotifications(false);
      return;
    }
    const data = await getNotifications(targetId);
    setLoadingNotifications(false);
    if (data) setNotificationsView(data);
  };

  const loadSections = async () => {
    const data = await getSections();
    if (data) setSections(data);
  };

  const loadStudentSections = async (id: string) => {
    const data = await getStudentSections(id);
    if (data) setStudentSections(data);
  };

  if (!user) {
    return (
      <div className="app">
        <header className="app__header">
          <div>
            <div className="eyebrow">School Engagement</div>
            <h1>Boarding School Portal</h1>
            <p className="lede">Sign in to view your dashboard.</p>
          </div>
        </header>
        <section className="panel">
          <div className="panel__header">
            <h2>Login</h2>
          </div>
          <div className="card">
            <label className="field">
              Username
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await login(loginUsername, loginPassword);
                if (!res.ok || !(res as any).user || !(res as any).token) {
                  setAuthError((res as any).error ?? "Login failed");
                  return;
                }
                setAuthError(null);
                setAuthToken((res as any).token);
                const loggedInUser = (res as any).user as CurrentUser;
                setUser(loggedInUser);
                // Send each role directly to its main dashboard.
                if (loggedInUser.role === "student") setTab("student");
                else if (loggedInUser.role === "parent") setTab("parent");
                else if (loggedInUser.role === "teacher") setTab("teacher");
                else if (loggedInUser.role === "nurse") setTab("nurse");
                else if (loggedInUser.role === "administrator") setTab("admin");
              }}
            >
              Sign In
            </button>
            {authError && <div className="status">{authError}</div>}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <div className="eyebrow">School Engagement</div>
          <h1>Boarding School Portal</h1>
          <p className="lede">
            Live dashboards for students, parents, teachers, and admins.
          </p>
        </div>
        <nav className="tabs">
          {user.role === "student" && (
            <>
              <button
                className={tab === "student" ? "active" : ""}
                onClick={() => setTab("student")}
              >
                Student Dashboard
              </button>
              <button
                className={tab === "notifications" ? "active" : ""}
                onClick={() => setTab("notifications")}
              >
                Notifications
              </button>
            </>
          )}
          {user.role === "parent" && (
            <>
              <button
                className={tab === "parent" ? "active" : ""}
                onClick={() => setTab("parent")}
              >
                Parent Dashboard
              </button>
              <button
                className={tab === "notifications" ? "active" : ""}
                onClick={() => setTab("notifications")}
              >
                Notifications
              </button>
            </>
          )}
          {user.role === "teacher" && (
            <>
              <button
                className={tab === "teacher" ? "active" : ""}
                onClick={() => setTab("teacher")}
              >
                Teacher Gradebook
              </button>
              <button
                className={tab === "notifications" ? "active" : ""}
                onClick={() => setTab("notifications")}
              >
                Notifications
              </button>
            </>
          )}
          {user.role === "nurse" && (
            <button
              className={tab === "nurse" ? "active" : ""}
              onClick={() => setTab("nurse")}
            >
              Nurse
            </button>
          )}
          {user.role === "administrator" && (
            <button
              className={tab === "admin" ? "active" : ""}
              onClick={() => setTab("admin")}
            >
              Admin
            </button>
          )}
        </nav>
      </header>

      {tab === "student" && user.role === "student" && (
        <section className="panel">
          <div className="panel__header">
            <h2>Student Dashboard</h2>
            <span className="badge">
              {loadingStudent ? "Loading…" : "Auto-refresh every 30s"}
            </span>
          </div>
          <div className="grid">
            {studentDashboard.map((card: DashboardCard) => (
              <div key={card.title} className="card">
                <h3>{card.title}</h3>
                <ul>
                  {card.items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Recent Feedback</h3>
            <ul>
              {feedbackView.map((f) => (
                <li key={f.comment}>
                  <span>{f.comment}</span>
                  <small>{f.createdAt}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Enroll in Section</h3>
            <label className="field">
              Student ID
              <input
                value={studentId}
                onChange={(e) => {
                  const next = e.target.value;
                  setStudentId(next);
                  loadStudentSections(next);
                }}
              />
            </label>
            <label className="field">
              Section ID
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.id} {s.teacherName ? `— ${s.teacherName}` : ""}
                  </option>
                ))}
                {!sections.length && (
                  <option value={sectionId}>{sectionId}</option>
                )}
              </select>
            </label>
            <label className="field">
              Parent ID (optional)
              <input
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                if (!studentId || !sectionId) {
                  setStatus("Please provide both student and section.");
                  return;
                }
                // If parentId is empty, pass undefined so backend handles it correctly
                const res = await enrollStudentInSection(
                  studentId,
                  sectionId,
                  parentId || undefined,
                  "parent"
                );
                const isOfflineDemo =
                  !res.ok && (res.error ?? "").includes("Failed to fetch");

                if (res.ok || isOfflineDemo) {
                  // Treat as successful even if backend is unreachable (demo mode).
                  setStatus(
                    res.ok
                      ? "Enrollment submitted"
                      : "Enrollment stored locally (no backend)"
                  );

                  // Update local view of student sections so the UI reflects the change.
                  const selected = sections.find((s) => s.id === sectionId);
                  if (
                    selected &&
                    !studentSections.find((s) => s.id === selected.id)
                  ) {
                    setStudentSections((prev) => [...prev, selected]);
                  }

                  await loadStudent();
                  await loadParent();
                } else {
                  setStatus(
                    `Enrollment failed: ${res.error ?? "unknown error"}`
                  );
                }
              }}
            >
              Enroll & Link Parent
            </button>
          </div>

          <div className="card">
            <h3>Link Parent (No Enrollment)</h3>
            <label className="field">
              Student ID
              <input value={studentId} readOnly />
            </label>
            <label className="field">
              Parent ID
              <input
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                placeholder="e.g. parent-user"
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                if (!studentId || !parentId) {
                  setStatus("Please provide both student and parent IDs.");
                  return;
                }
                const res = await linkParentToStudent(
                  parentId,
                  studentId,
                  "parent"
                );
                setStatus(
                  res.ok
                    ? "Parent linked successfully"
                    : `Link failed: ${res.error ?? "unknown error"}`
                );
                if (res.ok) {
                  await loadParent();
                }
              }}
            >
              Link Parent Only
            </button>
          </div>

          <div className="card">
            <h3>Your Sections</h3>
            <ul>
              {studentSections.map((s) => (
                <li key={s.id}>
                  <span>{s.name ?? s.id}</span>
                  <small>{s.teacherName ?? ""}</small>
                </li>
              ))}
              {!studentSections.length && <li>No sections yet</li>}
            </ul>
          </div>
          {status && <div className="status">{status}</div>}
        </section>
      )}

      {tab === "teacher" && user.role === "teacher" && (
        <section className="panel">
          <div className="panel__header">
            <h2>Teacher Gradebook</h2>
            <span className="badge">Section: Algebra 1 - Fall</span>
          </div>
          {sections.length > 0 && (
            <div className="card">
              <label className="field">
                Section
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ?? s.id}{" "}
                      {s.teacherName ? `— ${s.teacherName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="card">
            <label className="field">
              Teacher ID
              <input
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              />
            </label>
            <label className="field">
              Student ID
              <input
                value={studentId}
                onChange={(e) => {
                  const next = e.target.value;
                  setStudentId(next);
                  // When teacher picks a student, immediately load their data.
                  loadStudent(next);
                }}
              />
            </label>
          </div>
          {/** Filter grades/attendance for this section so the teacher sees live data they have entered. */}
          {(() => {
            const teacherGrades = studentGrades.filter(
              (g) => !sectionId || g.sectionId === sectionId
            );
            const teacherAttendance = studentAttendance.filter(
              (a) => !sectionId || a.sectionId === sectionId
            );
            return (
              <div className="split">
                <div className="card">
                  <h3>Grades</h3>
                  <p className="subtle">
                    Grades you have entered for this student in this section.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Assignment</th>
                        <th>Points</th>
                        <th>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherGrades.map((row) => (
                        <tr key={`${row.assignment}-${row.sectionId ?? ""}`}>
                          <td>{row.assignment}</td>
                          <td>{row.points}</td>
                          <td>{row.comment || "—"}</td>
                        </tr>
                      ))}
                      {!teacherGrades.length && (
                        <tr>
                          <td colSpan={3}>
                            No grades yet for this student/section.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="card">
                  <h3>Mark Attendance</h3>
                  <ul>
                    {teacherAttendance.map((a) => (
                      <li key={a.date}>
                        <span>{a.date}</span>
                        <strong>{a.status}</strong>
                      </li>
                    ))}
                    {!teacherAttendance.length && (
                      <li>
                        No attendance records yet for this student/section.
                      </li>
                    )}
                  </ul>
                  <button
                    className="primary"
                    onClick={async () => {
                      const today = new Date().toISOString();
                      const res = await teacherMarkAttendance(
                        teacherId,
                        sectionId,
                        studentId,
                        today,
                        "Present"
                      );
                      setTeacherStatus(
                        res.ok
                          ? "Attendance recorded"
                          : `Attendance failed: ${res.error ?? "unknown error"}`
                      );
                      if (res.ok) {
                        await loadStudent();
                        await loadNotifications();
                      }
                    }}
                  >
                    Mark Present Today
                  </button>
                </div>
                <div className="card">
                  <h3>Add / Update Grade</h3>
                  <label className="field">
                    Assignment ID
                    <input
                      value={gradeAssignmentId}
                      onChange={(e) => setGradeAssignmentId(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Points
                    <input
                      type="number"
                      value={gradePoints}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGradePoints(value === "" ? "" : Number(value));
                      }}
                    />
                  </label>
                  <button
                    className="primary"
                    onClick={async () => {
                      if (
                        !teacherId ||
                        !studentId ||
                        !sectionId ||
                        !gradeAssignmentId ||
                        gradePoints === ""
                      ) {
                        setTeacherStatus(
                          "Please provide teacher, student, section, assignment, and points."
                        );
                        return;
                      }
                      const res = await teacherUpdateGrade(
                        teacherId,
                        sectionId,
                        studentId,
                        gradeAssignmentId,
                        Number(gradePoints)
                      );
                      setTeacherStatus(
                        res.ok
                          ? "Grade saved"
                          : `Grade failed: ${res.error ?? "unknown error"}`
                      );
                      if (res.ok) {
                        // Refresh student dashboard data so the grade appears in teacher/student/parent views.
                        await loadStudent();
                        await loadNotifications();
                      }
                    }}
                  >
                    Save Grade
                  </button>
                </div>
                <div className="card">
                  <h3>Send Feedback to Student Only</h3>
                  <label className="field">
                    Feedback Message
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary"
                    onClick={async () => {
                      if (
                        !teacherId ||
                        !studentId ||
                        !sectionId ||
                        !feedbackComment
                      ) {
                        setTeacherStatus(
                          "Please provide teacher, student, section, and feedback message."
                        );
                        return;
                      }
                      const res = await sendTeacherFeedback(
                        teacherId,
                        studentId,
                        sectionId,
                        feedbackComment
                      );
                      setTeacherStatus(
                        res.ok
                          ? "Feedback sent to student"
                          : `Feedback failed: ${res.error ?? "unknown error"}`
                      );
                      if (res.ok) {
                        setFeedbackComment("");
                        // Refresh notifications so feedback appears in student/parent dashboards
                        await loadStudent();
                        await loadParent();
                        await loadNotifications();
                      }
                    }}
                  >
                    Send Feedback
                  </button>
                </div>
                <div className="card">
                  <h3>Send Message to Parent Only</h3>
                  <label className="field">
                    Parent Message
                    <textarea
                      value={teacherMessage}
                      onChange={(e) => setTeacherMessage(e.target.value)}
                      placeholder="Message will be sent only to parents"
                    />
                  </label>
                  <button
                    className="primary"
                    onClick={async () => {
                      if (
                        !teacherId ||
                        !studentId ||
                        !sectionId ||
                        !teacherMessage
                      ) {
                        setTeacherStatus(
                          "Please provide teacher, student, section, and message."
                        );
                        return;
                      }
                      const res = await sendTeacherMessage(
                        teacherId,
                        studentId,
                        sectionId,
                        teacherMessage
                      );
                      setTeacherStatus(
                        res.ok
                          ? "Message sent to parents"
                          : `Message failed: ${res.error ?? "unknown error"}`
                      );
                      if (res.ok) {
                        setTeacherMessage(
                          "Reminder: submit your project draft."
                        );
                        // Refresh notifications so message appears in parent dashboards
                        await loadParent();
                        await loadNotifications();
                      }
                    }}
                  >
                    Send to Parents
                  </button>
                </div>
                {teacherStatus && <div className="status">{teacherStatus}</div>}
              </div>
            );
          })()}
        </section>
      )}

      {tab === "notifications" &&
        (user.role === "student" ||
          user.role === "parent" ||
          user.role === "teacher") && (
          <section className="panel">
            <div className="panel__header">
              <h2>Notifications</h2>
              <span className="badge">
                {loadingNotifications ? "Loading…" : "Live via DomainEventBus"}
              </span>
            </div>
            <div className="card">
              <ul>
                {notificationsView.map((n) => (
                  <li key={n.message}>
                    <span>{n.message}</span>
                    <small>{n.createdAt}</small>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

      {tab === "nurse" && user.role === "nurse" && (
        <section className="panel">
          <div className="panel__header">
            <h2>Nurse Console</h2>
            <span className="badge">Record visits</span>
          </div>
          <div className="card">
            <label className="field">
              Nurse ID
              <input
                value={nurseId}
                onChange={(e) => setNurseId(e.target.value)}
              />
            </label>
            <label className="field">
              Student ID
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </label>
            <label className="field">
              Notes
              <textarea
                value={teacherMessage}
                onChange={(e) => setTeacherMessage(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await nurseRecordVisit(
                  nurseId,
                  studentId,
                  teacherMessage
                );
                setStatus(
                  res.ok
                    ? "Nurse visit recorded"
                    : `Visit failed: ${res.error ?? "unknown error"}`
                );
                if (res.ok) {
                  await loadStudent();
                }
              }}
            >
              Record Visit
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </section>
      )}

      {tab === "admin" && user.role === "administrator" && (
        <section className="panel">
          <div className="panel__header">
            <h2>Admin Console</h2>
            <span className="badge">Discipline actions</span>
          </div>
          <div className="card">
            <label className="field">
              Admin ID
              <input
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              />
            </label>
            <label className="field">
              Student ID
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </label>
            <label className="field">
              Action Type
              <input
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              />
            </label>
            <label className="field">
              Notes
              <textarea
                value={teacherMessage}
                onChange={(e) => setTeacherMessage(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await adminRecordDiscipline(
                  adminId,
                  studentId,
                  sectionId,
                  teacherMessage
                );
                setStatus(
                  res.ok
                    ? "Discipline recorded"
                    : `Discipline failed: ${res.error ?? "unknown error"}`
                );
                if (res.ok) {
                  await loadParent();
                  await loadStudent();
                }
              }}
            >
              Record Discipline
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </section>
      )}

      {tab === "parent" && user.role === "parent" && (
        <section className="panel">
          <div className="panel__header">
            <h2>Parent Dashboard</h2>
            <span className="badge">Includes parent-only messages</span>
          </div>
          <div className="grid">
            {parentDashboard.map((card: DashboardCard) => (
              <div key={card.title} className="card">
                <h3>{card.title}</h3>
                <ul>
                  {card.items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Messages from Teachers</h3>
            <ul>
              {parentNotificationsView
                .filter((n) => n.type === "TeacherMessage")
                .map((n) => (
                  <li key={n.message}>
                    <span>{n.message}</span>
                    <small>{n.createdAt}</small>
                  </li>
                ))}
              {parentNotificationsView.filter(
                (n) => n.type === "TeacherMessage"
              ).length === 0 && <li>No messages yet</li>}
            </ul>
          </div>
          <div className="card">
            <h3>Messages from Nurse</h3>
            <ul>
              {nurseMessages.map((m) => (
                <li key={m.visitTime}>
                  <span>{m.notes}</span>
                  <small>{m.visitTime}</small>
                </li>
              ))}
              {!nurseMessages.length && <li>No nurse notes yet</li>}
            </ul>
          </div>
          <div className="card">
            <h3>Select / Link Child</h3>
            <label className="field">
              Parent ID
              <input value={parentId} readOnly />
            </label>
            <label className="field">
              Child (Student) ID
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                if (!parentId || !studentId) {
                  setStatus("Please provide both parent and child IDs.");
                  return;
                }
                const res = await linkParentToStudent(
                  parentId,
                  studentId,
                  "parent" // relationship
                );
                setStatus(
                  res.ok
                    ? "Parent linked to student"
                    : `Link failed: ${res.error ?? "unknown error"}`
                );
                if (res.ok) {
                  await loadParent();
                }
              }}
            >
              Link Child
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </section>
      )}
    </div>
  );
}

export default App;
