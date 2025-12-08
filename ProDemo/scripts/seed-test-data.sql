-- Clear existing data to avoid conflicts
DELETE FROM role_permissions;
DELETE FROM notifications;
DELETE FROM discipline_actions;
DELETE FROM nurse_visits;
DELETE FROM attendance_records;
DELETE FROM feedback;
DELETE FROM grade_entries;
DELETE FROM assignments;
DELETE FROM enrollments;
DELETE FROM sections;
DELETE FROM classes;
DELETE FROM parent_student_links;
DELETE FROM parents;
DELETE FROM teachers;
DELETE FROM students;
DELETE FROM users;

-- Create users
INSERT INTO users (id, username, password_hash, role) VALUES ('student-user', 'student', 'pw', 'student');
INSERT INTO users (id, username, password_hash, role) VALUES ('teacher-user', 'teacher', 'pw', 'teacher');
INSERT INTO users (id, username, password_hash, role) VALUES ('parent-user', 'parent', 'pw', 'parent');
INSERT INTO users (id, username, password_hash, role) VALUES ('nurse-user', 'nurse', 'pw', 'nurse');
INSERT INTO users (id, username, password_hash, role) VALUES ('admin-user', 'admin', 'pw', 'administrator');

-- Create profiles (Only for tables that exist)
INSERT INTO students (id, name) VALUES ('student-user', 'John Doe');
INSERT INTO teachers (id, name) VALUES ('teacher-user', 'Ms. Smith');
INSERT INTO parents (id, name) VALUES ('parent-user', 'Jane Doe');
-- Note: nurses and administrators tables do not exist in current schema, so we skip profile creation for them.
-- They still exist as users.

-- Link parent
INSERT INTO parent_student_links (parent_id, student_id, relationship) VALUES ('parent-user', 'student-user', 'mother');

-- Create Class & Section
INSERT INTO classes (id, name, subject) VALUES ('class-1', 'Mathematics 101', 'Algebra');
INSERT INTO sections (id, class_id, teacher_id, term) VALUES ('section-1', 'class-1', 'teacher-user', 'Fall 2024');

-- Enroll Student (CORRECTED: No ID column)
INSERT INTO enrollments (student_id, section_id) VALUES ('student-user', 'section-1');

-- Create Assignment
INSERT INTO assignments (id, section_id, title, max_points, due_date) VALUES ('assignment-1', 'section-1', 'Algebra Assignment', 100, datetime('now'));

-- Permissions
INSERT INTO role_permissions (role, permission) VALUES ('teacher', 'grade:update');
INSERT INTO role_permissions (role, permission) VALUES ('administrator', 'discipline:record');
