import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { readdirSync, readFileSync } from "fs";
import { createSqlJsDatabase } from "../src/datasource/sqljs";
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
  SqliteEnrollmentRepository,
} from "../src/datasource/sqlite";
import {
  AuthService,
  AttendanceService,
  DashboardService,
  DisciplineService,
  DomainEventBus,
  GradebookService,
  HealthService,
  NotificationService,
  AccessControlService,
  EnrollmentService,
} from "../src/domain/services";
import { StudentParentRoutingStrategy } from "../src/domain/notificationRouting";
import type { User } from "../src/domain/entities";
import { randomUUID } from "crypto";

async function applyMigrations(dbFilePath: string) {
  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const { db, persist } = await createSqlJsDatabase(dbFilePath);
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
  }
  persist();
}

async function seedIfEmpty(db: any, persist: () => void) {
  // IMPORTANT: Do NOT seed automatically. Only seed when explicitly requested via SEED_DB=true
  // This ensures the database starts completely empty for testing use cases.
  // To seed for testing, run: SEED_DB=true npm run serve
  if (process.env.SEED_DB !== "true") {
    console.log(
      "Database started empty (no seeding). Set SEED_DB=true to add demo data."
    );
    return;
  }

  console.log("Seeding database with demo data...");

  // Seed users for each role
  db.run(
    "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["teacher-1", "teacher", "pw", "teacher"]
  );
  db.run(
    "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["student-1", "student", "pw", "student"]
  );
  db.run(
    "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["parent-1", "parent", "pw", "parent"]
  );
  db.run(
    "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["nurse-1", "nurse", "pw", "nurse"]
  );
  db.run(
    "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
    ["admin-1", "admin", "pw", "administrator"]
  );

  // Seed related entities
  db.run("INSERT OR IGNORE INTO students (id, name) VALUES (?, ?)", [
    "student-1",
    "Ada Lovelace",
  ]);
  db.run("INSERT OR IGNORE INTO parents (id, name) VALUES (?, ?)", [
    "parent-1",
    "Parent One",
  ]);
  db.run(
    "INSERT OR IGNORE INTO parent_student_links (parent_id, student_id, relationship) VALUES (?, ?, ?)",
    ["parent-1", "student-1", "mother"]
  );
  db.run("INSERT OR IGNORE INTO teachers (id, name) VALUES (?, ?)", [
    "teacher-1",
    "Mr. T",
  ]);
  db.run("INSERT OR IGNORE INTO classes (id, name, subject) VALUES (?, ?, ?)", [
    "class-1",
    "Math",
    "Algebra",
  ]);
  db.run(
    "INSERT OR IGNORE INTO sections (id, class_id, teacher_id, term) VALUES (?, ?, ?, ?)",
    ["section-1", "class-1", "teacher-1", "Fall"]
  );
  db.run(
    "INSERT OR IGNORE INTO assignments (id, section_id, title, max_points, due_date) VALUES (?, ?, ?, ?, ?)",
    ["assignment-1", "section-1", "Essay", 100, new Date().toISOString()]
  );
  db.run(
    "INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)",
    ["teacher", "grade:update"]
  );

  persist();
  console.log("Demo data seeding completed.");
}

async function main() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  const dbPath = path.join(__dirname, "..", "data", "app.db");
  await applyMigrations(dbPath);
  const { db, persist } = await createSqlJsDatabase(dbPath);
  await seedIfEmpty(db, persist);

  // Repos
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
  const enrollments = new SqliteEnrollmentRepository(db);

  const bus = new DomainEventBus();

  // Services
  const authService = new AuthService(users, sessions);
  const gradebookService = new GradebookService(
    gradebook,
    assignments,
    feedback,
    bus
  );
  const attendanceService = new AttendanceService(attendance, bus);
  const healthService = new HealthService(health, bus);
  const disciplineService = new DisciplineService(discipline, bus);
  const notificationService = new NotificationService(
    notifications,
    bus,
    new StudentParentRoutingStrategy(parentLinks)
  );

  // Track active SSE connections per user
  const sseClients = new Map<string, Set<any>>();

  function broadcastEvent(event: any, eventType: string) {
    // Broadcast to all connected clients
    for (const [userId, clients] of sseClients) {
      for (const client of clients) {
        try {
          client.write(
            `data: ${JSON.stringify({ type: eventType, event })}\n\n`
          );
        } catch (err) {
          console.error("Error sending SSE message:", err);
        }
      }
    }
  }

  // Subscribe to domain events and create notifications for students and parents
  bus.subscribe("GradesUpdated", (event) => {
    notificationService
      .notify(event)
      .catch((err) =>
        console.error("Error creating notification for GradesUpdated:", err)
      );
    broadcastEvent(event, "GradesUpdated");
  });
  bus.subscribe("AttendanceUpdated", (event) => {
    notificationService
      .notify(event)
      .catch((err) =>
        console.error("Error creating notification for AttendanceUpdated:", err)
      );
    broadcastEvent(event, "AttendanceUpdated");
  });
  bus.subscribe("NurseVisitLogged", (event) => {
    notificationService
      .notify(event)
      .catch((err) =>
        console.error("Error creating notification for NurseVisitLogged:", err)
      );
    broadcastEvent(event, "NurseVisitLogged");
  });
  bus.subscribe("DisciplineRecorded", (event) => {
    notificationService
      .notify(event)
      .catch((err) =>
        console.error(
          "Error creating notification for DisciplineRecorded:",
          err
        )
      );
    broadcastEvent(event, "DisciplineRecorded");
  });
  const dashboardService = new DashboardService(
    students,
    parents,
    parentLinks,
    sections,
    gradebook,
    attendance,
    feedback,
    health,
    discipline
  );
  const enrollmentService = new EnrollmentService(enrollments, parentLinks);

  // Simple auth middleware using Bearer token + sessions.
  type AuthedRequest = Request & { user?: User };

  const requireAuth =
    () =>
    async (
      req: AuthedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const header = req.headers["authorization"] as string | undefined;
        if (!header || !header.startsWith("Bearer ")) {
          res.status(401).send("Missing Authorization header");
          return;
        }
        const token = header.slice("Bearer ".length);
        const user = await authService.getCurrentUser(token);
        if (!user) {
          res.status(401).send("Invalid or expired session");
          return;
        }
        req.user = user;
        next();
      } catch (err) {
        res.status(500).send(String(err));
      }
    };

  // Authentication
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).send("username and password are required");
    }
    try {
      const session = await authService.authenticate(username, password);
      if (!session) {
        return res.status(401).send("Invalid credentials");
      }
      const user = await authService.getCurrentUser(session.token);
      if (!user) {
        return res.status(500).send("User not found for session");
      }
      res.json({
        token: session.token,
        user: { id: user.id, username: user.username, role: user.role },
      });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  // Sections list
  app.get("/api/sections", (_req, res) => {
    const sql = `
      SELECT s.id, c.name, s.term, t.name as teacherName
      FROM sections s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN teachers t ON t.id = s.teacher_id
    `;
    const stmt = db.prepare(sql);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  app.get("/api/students/:id/sections", (req, res) => {
    const sql = `
      SELECT s.id, c.name, s.term, t.name as teacherName
      FROM sections s
      JOIN enrollments e ON e.section_id = s.id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN teachers t ON t.id = s.teacher_id
      WHERE e.student_id = ?
    `;
    const stmt = db.prepare(sql);
    stmt.bind([req.params.id]);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(rows);
  });

  app.post("/api/enrollments", async (req, res) => {
    const { studentId, sectionId, parentId, relationship } = req.body;
    if (!studentId || !sectionId) {
      return res.status(400).send("studentId and sectionId are required");
    }
    try {
      await enrollmentService.enrollStudentInSection(
        studentId,
        sectionId,
        parentId,
        relationship
      );
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post("/api/parent-links", async (req, res) => {
    const { parentId, studentId, relationship } = req.body;
    if (!parentId || !studentId)
      return res.status(400).send("parentId and studentId are required");
    try {
      await parentLinks.save({
        parentId,
        studentId,
        relationship: relationship ?? "parent",
      });
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.get("/api/dashboard/student/:id", async (req, res) => {
    try {
      const data = await dashboardService.buildDashboardForStudent(
        req.params.id
      );
      // Look up the student's sections with teacher names for grouping.
      const sectionStmt = db.prepare(`
        SELECT s.id, c.name, s.term, t.name as teacherName
        FROM sections s
        JOIN enrollments e ON e.section_id = s.id
        LEFT JOIN classes c ON c.id = s.class_id
        LEFT JOIN teachers t ON t.id = s.teacher_id
        WHERE e.student_id = ?
      `);
      sectionStmt.bind([req.params.id]);
      const sectionRows: any[] = [];
      while (sectionStmt.step()) {
        sectionRows.push(sectionStmt.getAsObject());
      }
      sectionStmt.free();
      const sectionById = new Map<string, any>(
        sectionRows.map((r) => [String(r.id), r])
      );

      res.json({
        grades: data.gradesSummary?.map((g: any) => ({
          assignment: g.assignmentId ?? g.assignment_id ?? "n/a",
          points: g.points,
          comment: g.comment,
          sectionId: g.sectionId ?? g.section_id ?? null,
          sectionName:
            (g.sectionId ?? g.section_id) &&
            sectionById.get(String(g.sectionId ?? g.section_id))?.name
              ? sectionById.get(String(g.sectionId ?? g.section_id)).name
              : null,
          teacherName:
            (g.sectionId ?? g.section_id) &&
            sectionById.get(String(g.sectionId ?? g.section_id))?.teacherName
              ? sectionById.get(String(g.sectionId ?? g.section_id)).teacherName
              : null,
        })),
        attendance: data.attendanceSummary?.map((a: any) => ({
          date: a.date,
          status: a.status,
          sectionId: a.sectionId ?? a.section_id ?? null,
          sectionName:
            (a.sectionId ?? a.section_id) &&
            sectionById.get(String(a.sectionId ?? a.section_id))?.name
              ? sectionById.get(String(a.sectionId ?? a.section_id)).name
              : null,
          teacherName:
            (a.sectionId ?? a.section_id) &&
            sectionById.get(String(a.sectionId ?? a.section_id))?.teacherName
              ? sectionById.get(String(a.sectionId ?? a.section_id)).teacherName
              : null,
        })),
        feedback: data.feedbackSummary?.map((f: any) => ({
          comment: f.comment,
          createdAt: f.createdAt ?? f.created_at ?? "",
        })),
      });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post("/api/grades", async (req, res) => {
    const { teacherId, sectionId, studentId, assignmentId, points, comment } =
      req.body;
    console.log("POST /api/grades body", req.body);
    const numericPoints = Number(points);
    if (
      !teacherId ||
      !sectionId ||
      !studentId ||
      !assignmentId ||
      Number.isNaN(numericPoints)
    ) {
      return res
        .status(400)
        .send(
          "teacherId, sectionId, studentId, assignmentId, and numeric points are required"
        );
    }
    try {
      await gradebookService.updateGrade(
        assignmentId,
        studentId,
        numericPoints,
        comment ?? ""
      );
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error in /api/grades", err);
      res.status(500).send(String(err));
    }
  });

  app.post("/api/attendance", async (req, res) => {
    const { teacherId, sectionId, studentId, date, status, reason } = req.body;
    if (!teacherId || !sectionId || !studentId || !date || !status) {
      return res
        .status(400)
        .send("teacherId, sectionId, studentId, date, and status are required");
    }
    try {
      await attendanceService.markAttendance(
        sectionId,
        studentId,
        date,
        status,
        reason ?? ""
      );
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post("/api/nurse-visits", async (req, res) => {
    const { nurseId, studentId, notes } = req.body;
    if (!nurseId || !studentId || !notes) {
      return res.status(400).send("nurseId, studentId, and notes are required");
    }
    try {
      await healthService.recordVisit(studentId, nurseId, notes);
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post("/api/discipline", async (req, res) => {
    const { adminId, studentId, actionType, notes } = req.body;
    if (!adminId || !studentId || !actionType) {
      return res
        .status(400)
        .send("adminId, studentId, and actionType are required");
    }
    try {
      await disciplineService.recordDiscipline(
        studentId,
        adminId,
        actionType,
        notes ?? ""
      );
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.get("/api/dashboard/parent/:id", async (req, res) => {
    try {
      const dashboards = await dashboardService.buildDashboardForParent(
        req.params.id
      );
      if (!dashboards || dashboards.length === 0) {
        return res.json({ grades: [], attendance: [], feedback: [] });
      }

      // Build section lookup (with teacher names) for all of this parent's children.
      const sectionStmt = db.prepare(`
        SELECT DISTINCT s.id, c.name, s.term, t.name as teacherName
        FROM sections s
        JOIN enrollments e ON e.section_id = s.id
        JOIN parent_student_links l ON l.student_id = e.student_id
        LEFT JOIN classes c ON c.id = s.class_id
        LEFT JOIN teachers t ON t.id = s.teacher_id
        WHERE l.parent_id = ?
      `);
      sectionStmt.bind([req.params.id]);
      const sectionRows: any[] = [];
      while (sectionStmt.step()) {
        sectionRows.push(sectionStmt.getAsObject());
      }
      sectionStmt.free();
      const sectionById = new Map<string, any>(
        sectionRows.map((r) => [String(r.id), r])
      );

      // For now, flatten all linked children into a single summary
      const allGrades: any[] = [];
      const allAttendance: any[] = [];
      const allFeedback: any[] = [];
      for (const d of dashboards as any[]) {
        if (Array.isArray(d.gradesSummary)) {
          allGrades.push(...d.gradesSummary);
        }
        if (Array.isArray(d.attendanceSummary)) {
          allAttendance.push(...d.attendanceSummary);
        }
        if (Array.isArray(d.feedbackSummary)) {
          allFeedback.push(...d.feedbackSummary);
        }
      }
      res.json({
        grades: allGrades.map((g) => ({
          assignment: g.assignmentId ?? g.assignment_id ?? "n/a",
          points: g.points,
          comment: g.comment,
          sectionId: g.sectionId ?? g.section_id ?? null,
          sectionName:
            (g.sectionId ?? g.section_id) &&
            sectionById.get(String(g.sectionId ?? g.section_id))?.name
              ? sectionById.get(String(g.sectionId ?? g.section_id)).name
              : null,
          teacherName:
            (g.sectionId ?? g.section_id) &&
            sectionById.get(String(g.sectionId ?? g.section_id))?.teacherName
              ? sectionById.get(String(g.sectionId ?? g.section_id)).teacherName
              : null,
        })),
        attendance: allAttendance.map((a) => ({
          date: a.date,
          status: a.status,
          sectionId: a.sectionId ?? a.section_id ?? null,
          sectionName:
            (a.sectionId ?? a.section_id) &&
            sectionById.get(String(a.sectionId ?? a.section_id))?.name
              ? sectionById.get(String(a.sectionId ?? a.section_id)).name
              : null,
          teacherName:
            (a.sectionId ?? a.section_id) &&
            sectionById.get(String(a.sectionId ?? a.section_id))?.teacherName
              ? sectionById.get(String(a.sectionId ?? a.section_id)).teacherName
              : null,
        })),
        feedback: allFeedback.map((f) => ({
          comment: f.comment,
          createdAt: f.createdAt ?? f.created_at ?? "",
        })),
      });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const rows = await notifications.findByUserId(req.params.userId);
      res.json(
        rows.map((r) => ({
          message: r.message,
          type: (r as any).type ?? "Unknown",
          createdAt: (r as any).created_at ?? r.createdAt ?? "",
        }))
      );
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post("/api/notifications/teacher-message", async (req, res) => {
    const { teacherId, studentId, sectionId, message } = req.body;
    if (!teacherId || !studentId || !sectionId || !message) {
      return res
        .status(400)
        .send("teacherId, studentId, sectionId, and message are required");
    }
    try {
      await notificationService.notifyTeacherMessage(
        teacherId,
        studentId,
        sectionId,
        message
      );
      // Broadcast to all connected clients
      broadcastEvent({ studentId }, "TeacherMessage");
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post("/api/feedback", async (req, res) => {
    const { teacherId, studentId, sectionId, comment } = req.body;
    if (!teacherId || !studentId || !sectionId || !comment) {
      return res
        .status(400)
        .send("teacherId, studentId, sectionId, and comment are required");
    }
    try {
      // Save feedback to database and trigger notification event
      await gradebookService.addFeedback(
        studentId,
        sectionId,
        comment,
        teacherId
      );
      // Send feedback notification ONLY to student
      await notificationService.notifyFeedbackToStudent(
        teacherId,
        studentId,
        sectionId,
        comment
      );
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  // Server-Sent Events endpoint for real-time updates
  app.get("/api/events/:userId", (req, res) => {
    const userId = req.params.userId;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Send initial connection message
    res.write(`:connected\n\n`);

    // Add this client to the tracking map
    if (!sseClients.has(userId)) {
      sseClients.set(userId, new Set());
    }
    const clientSet = sseClients.get(userId)!;
    clientSet.add(res);

    // Handle client disconnect
    res.on("close", () => {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        sseClients.delete(userId);
      }
    });

    // Keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch (err) {
        clearInterval(keepAliveInterval);
      }
    }, 30000);

    res.on("close", () => {
      clearInterval(keepAliveInterval);
    });
  });

  const port = Number(process.env.PORT) || 43210;
  app.listen(port, "127.0.0.1", () => {
    console.log(`API server running on http://127.0.0.1:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
