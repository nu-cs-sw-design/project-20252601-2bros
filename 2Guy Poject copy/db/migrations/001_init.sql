PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parent_student_links (
  parent_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  relationship TEXT,
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  term TEXT,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  student_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  PRIMARY KEY (student_id, section_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  title TEXT NOT NULL,
  max_points REAL NOT NULL,
  due_date TEXT,
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

CREATE TABLE IF NOT EXISTS grade_entries (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  points REAL NOT NULL,
  comment TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  comment TEXT,
  created_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (section_id) REFERENCES sections(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

CREATE TABLE IF NOT EXISTS nurse_visits (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  nurse_id TEXT NOT NULL,
  visit_time TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS discipline_actions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  date TEXT NOT NULL,
  action_type TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
