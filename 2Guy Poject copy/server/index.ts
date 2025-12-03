import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { readdirSync, readFileSync } from 'fs';
import { createSqlJsDatabase } from '../src/datasource/sqljs';
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
} from '../src/datasource/sqlite';
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
} from '../src/domain/services';
import { StudentParentRoutingStrategy } from '../src/domain/notificationRouting';
import { randomUUID } from 'crypto';

async function applyMigrations(dbFilePath: string) {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const { db, persist } = await createSqlJsDatabase(dbFilePath);
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
  }
  persist();
}

async function seedIfEmpty(db: any, persist: () => void) {
  const hasSections = db.exec('SELECT COUNT(*) as c FROM sections')?.[0]?.values?.[0]?.[0] ?? 0;
  // Always ensure core users exist (INSERT OR IGNORE is idempotent),
  // even if the DB already has sections.
  // Users for each role
  db.run('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [
    'teacher-1',
    'teacher',
    'pw',
    'teacher',
  ]);
  db.run('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [
    'student-1',
    'student',
    'pw',
    'student',
  ]);
  db.run('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [
    'parent-1',
    'parent',
    'pw',
    'parent',
  ]);
  db.run('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [
    'nurse-1',
    'nurse',
    'pw',
    'nurse',
  ]);
  db.run('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [
    'admin-1',
    'admin',
    'pw',
    'administrator',
  ]);
  // Only seed sections/classes on first run.
  if (hasSections === 0) {
    db.run('INSERT OR IGNORE INTO students (id, name) VALUES (?, ?)', ['student-1', 'Ada Lovelace']);
    db.run('INSERT OR IGNORE INTO parents (id, name) VALUES (?, ?)', ['parent-1', 'Parent One']);
    db.run('INSERT OR IGNORE INTO parent_student_links (parent_id, student_id, relationship) VALUES (?, ?, ?)', [
      'parent-1',
      'student-1',
      'mother',
    ]);
    db.run('INSERT OR IGNORE INTO teachers (id, name) VALUES (?, ?)', ['teacher-1', 'Mr. T']);
    db.run('INSERT OR IGNORE INTO classes (id, name, subject) VALUES (?, ?, ?)', ['class-1', 'Math', 'Algebra']);
    db.run('INSERT OR IGNORE INTO sections (id, class_id, teacher_id, term) VALUES (?, ?, ?, ?)', [
      'section-1',
      'class-1',
      'teacher-1',
      'Fall',
    ]);
    db.run('INSERT OR IGNORE INTO assignments (id, section_id, title, max_points, due_date) VALUES (?, ?, ?, ?, ?)', [
      'assignment-1',
      'section-1',
      'Essay',
      100,
      new Date().toISOString(),
    ]);
    db.run('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)', ['teacher', 'grade:update']);
  }
  persist();
}

async function main() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  const dbPath = path.join(__dirname, '..', 'data', 'app.db');
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
  const enrollmentService = new EnrollmentService(enrollments, parentLinks);

  // Authentication
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).send('username and password are required');
    }
    try {
      const session = await authService.authenticate(username, password);
      if (!session) {
        return res.status(401).send('Invalid credentials');
      }
      const user = await authService.getCurrentUser(session.token);
      if (!user) {
        return res.status(500).send('User not found for session');
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
  app.get('/api/sections', (_req, res) => {
    const sql = `
      SELECT s.id, s.name, s.term, t.name as teacherName
      FROM sections s
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

  app.get('/api/students/:id/sections', (req, res) => {
    const sql = `
      SELECT s.id, s.name, s.term, t.name as teacherName
      FROM sections s
      JOIN enrollments e ON e.section_id = s.id
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

  app.post('/api/enrollments', async (req, res) => {
  const { studentId, sectionId, parentId, relationship } = req.body;
  if (!studentId || !sectionId) {
    return res.status(400).send('studentId and sectionId are required');
  }
  try {
    await enrollmentService.enrollStudentInSection(studentId, sectionId, parentId, relationship);
    persist();
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).send(String(err));
  }
});

app.post('/api/parent-links', async (req, res) => {
  const { parentId, studentId, relationship } = req.body;
  if (!parentId || !studentId) return res.status(400).send('parentId and studentId are required');
  try {
    await parentLinks.save({ parentId, studentId, relationship: relationship ?? 'parent' });
    persist();
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).send(String(err));
  }
});

  app.get('/api/dashboard/student/:id', async (req, res) => {
    try {
      const data = await dashboardService.buildDashboardForStudent(req.params.id);
      res.json({
        grades: data.gradesSummary?.map((g: any) => ({
          assignment: g.assignmentId ?? g.assignment_id ?? 'n/a',
          points: g.points,
          comment: g.comment,
        })),
        attendance: data.attendanceSummary?.map((a: any) => ({
          date: a.date,
          status: a.status,
        })),
        feedback: data.feedbackSummary?.map((f: any) => ({
          comment: f.comment,
          createdAt: f.createdAt ?? f.created_at ?? '',
        })),
      });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post('/api/grades', async (req, res) => {
    const { teacherId, sectionId, studentId, assignmentId, points, comment } = req.body;
    if (!teacherId || !sectionId || !studentId || !assignmentId || typeof points !== 'number') {
      return res.status(400).send('teacherId, sectionId, studentId, assignmentId, and numeric points are required');
    }
    try {
      await gradebookService.updateGrade(assignmentId, studentId, points, comment ?? '');
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post('/api/attendance', async (req, res) => {
    const { teacherId, sectionId, studentId, date, status, reason } = req.body;
    if (!teacherId || !sectionId || !studentId || !date || !status) {
      return res.status(400).send('teacherId, sectionId, studentId, date, and status are required');
    }
    try {
      await attendanceService.markAttendance(sectionId, studentId, date, status, reason ?? '');
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post('/api/nurse-visits', async (req, res) => {
    const { nurseId, studentId, notes } = req.body;
    if (!nurseId || !studentId || !notes) {
      return res.status(400).send('nurseId, studentId, and notes are required');
    }
    try {
      await healthService.recordVisit(studentId, nurseId, notes);
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.post('/api/discipline', async (req, res) => {
    const { adminId, studentId, actionType, notes } = req.body;
    if (!adminId || !studentId || !actionType) {
      return res.status(400).send('adminId, studentId, and actionType are required');
    }
    try {
      await disciplineService.recordDiscipline(studentId, adminId, actionType, notes ?? '');
      persist();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

  app.get('/api/dashboard/parent/:id', async (req, res) => {
    try {
      const dashboards = await dashboardService.buildDashboardForParent(req.params.id);
      if (!dashboards || dashboards.length === 0) {
        return res.json({ grades: [], attendance: [], feedback: [] });
      }
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
        grades: allGrades.map(g => ({
          assignment: g.assignmentId ?? g.assignment_id ?? 'n/a',
          points: g.points,
          comment: g.comment,
        })),
        attendance: allAttendance.map(a => ({
          date: a.date,
          status: a.status,
        })),
        feedback: allFeedback.map(f => ({
          comment: f.comment,
          createdAt: f.createdAt ?? f.created_at ?? '',
        })),
      });
    } catch (err) {
      res.status(500).send(String(err));
    }
  });

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const rows = await notifications.findByUserId(req.params.userId);
    res.json(rows.map(r => ({ message: r.message, createdAt: (r as any).created_at ?? r.createdAt ?? '' })));
  } catch (err) {
    res.status(500).send(String(err));
  }
});

  app.post('/api/notifications/teacher-message', async (req, res) => {
    const { teacherId, studentId, sectionId, message } = req.body;
    if (!teacherId || !studentId || !sectionId || !message) {
      return res.status(400).send('teacherId, studentId, sectionId, and message are required');
    }
    try {
      await notificationService.notifyTeacherMessage(teacherId, studentId, sectionId, message);
      persist();
      res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).send(String(err));
  }
});

  const port = Number(process.env.PORT) || 43210;
  app.listen(port, '127.0.0.1', () => {
    console.log(`API server running on http://127.0.0.1:${port}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
