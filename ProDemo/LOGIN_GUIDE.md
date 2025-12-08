# Login Guide - How to Access Each Role

## Quick Start

The application has a simple login system. Since the database starts **empty by default**, you need to create users first.

### Two Options:

#### **Option A: Use Seeded Demo Data (Fastest)**

If you started the server with demo data:

```bash
SEED_DB=true npm run serve
```

Pre-created users are ready to use (see table below).

#### **Option B: Manual User Creation (Clean Database)**

If you started with an empty database:

```bash
npm run serve
```

You'll need to create users manually via the database. See "Creating Users Manually" section below.

---

## Pre-Seeded Demo Users

If you ran the server with `SEED_DB=true`, these users are automatically created:

| Role        | Username  | Password | ID          | Purpose                                          |
| ----------- | --------- | -------- | ----------- | ------------------------------------------------ |
| **Student** | `student` | `pw`     | `student-1` | View own grades, attendance, feedback            |
| **Parent**  | `parent`  | `pw`     | `parent-1`  | View linked child's grades, attendance, messages |
| **Teacher** | `teacher` | `pw`     | `teacher-1` | Submit grades, attendance, feedback              |
| **Nurse**   | `nurse`   | `pw`     | `nurse-1`   | Record student health visits                     |
| **Admin**   | `admin`   | `pw`     | `admin-1`   | Record discipline actions                        |

### How to Login:

1. Open the app: `http://` (or the port shown by Vite)
2. In the **Login** section at the top:
   - **Username**: Enter one from table above (e.g., `student`)
   - **Password**: Enter `pw`
3. Click **"Sign In"**
4. You'll be automatically directed to that role's dashboard

---

## Creating Users Manually

If you're testing with an empty database, you need to manually insert users.

### Option 1: Direct Database Insert (Fastest)

Use a SQLite client to execute this SQL:

```sql
-- Create a teacher
INSERT INTO users (id, username, password_hash, role)
VALUES ('teacher-1', 'teacher', 'pw', 'teacher');

-- Create a student
INSERT INTO users (id, username, password_hash, role)
VALUES ('student-1', 'student', 'pw', 'student');

-- Create a parent
INSERT INTO users (id, username, password_hash, role)
VALUES ('parent-1', 'parent', 'pw', 'parent');

-- Create a nurse
INSERT INTO users (id, username, password_hash, role)
VALUES ('nurse-1', 'nurse', 'pw', 'nurse');

-- Create an admin
INSERT INTO users (id, username, password_hash, role)
VALUES ('admin-1', 'admin', 'pw', 'administrator');

-- Link parent to student (required for parent to see student data)
INSERT INTO parent_student_links (parent_id, student_id, relationship)
VALUES ('parent-1', 'student-1', 'mother');

-- Create a teacher profile
INSERT INTO teachers (id, name) VALUES ('teacher-1', 'Mr. T');

-- Create a student profile
INSERT INTO students (id, name) VALUES ('student-1', 'Ada Lovelace');

-- Create a parent profile
INSERT INTO parents (id, name) VALUES ('parent-1', 'Parent One');

-- Create a nurse profile
INSERT INTO nurses (id, name) VALUES ('nurse-1', 'Nurse Jane');

-- Create an admin profile
INSERT INTO administrators (id, name) VALUES ('admin-1', 'Admin Alice');

-- Create a class
INSERT INTO classes (id, name, subject)
VALUES ('class-1', 'Math 101', 'Algebra');

-- Create a section (teacher teaching this section)
INSERT INTO sections (id, class_id, teacher_id, term)
VALUES ('section-1', 'class-1', 'teacher-1', 'Fall 2024');

-- Enroll student in section
INSERT INTO enrollments (id, student_id, section_id)
VALUES ('enrollment-1', 'student-1', 'section-1');

-- Create an assignment
INSERT INTO assignments (id, section_id, title, max_points, due_date)
VALUES ('assignment-1', 'section-1', 'Essay', 100, datetime('now'));

-- Add role permissions
INSERT INTO role_permissions (role, permission)
VALUES ('teacher', 'grade:update');
```

### Option 2: Create Users One at a Time via CLI

You can use any SQLite client (e.g., `sqlite3` command line):

```bash
# Open the database
sqlite3 data/app.db

# Inside sqlite3 prompt:
INSERT INTO users (id, username, password_hash, role) VALUES ('student-1', 'student', 'pw', 'student');
INSERT INTO users (id, username, password_hash, role) VALUES ('teacher-1', 'teacher', 'pw', 'teacher');
INSERT INTO users (id, username, password_hash, role) VALUES ('parent-1', 'parent', 'pw', 'parent');

# Then login with those credentials
.exit
```
```

Then reset and apply:

```bash
npm run db:reset
npm run serve
```

---

## Login UI & Behavior

### Login Form

Located at the top of the application:

```
┌─ Login ───────────────────┐
│ Username: [student      ] │
│ Password: [●●●●●●●●●●●●] │
│          [Sign In button] │
└───────────────────────────┘
```

### After Successful Login

- **Token**: Saved to browser (used for API authentication)
- **User**: Displayed in UI (shows logged-in user details)
- **Auto-redirect**: You're sent to your role's dashboard:
  - Student → Student Dashboard
  - Parent → Parent Dashboard
  - Teacher → Teacher Section
  - Nurse → Nurse Section
  - Admin → Admin Section

### If Login Fails

- Error message appears: **"Invalid credentials"**
- Check username and password match exactly
- If user doesn't exist, create them first (see "Creating Users Manually")

---

## Password Security Note

⚠️ **IMPORTANT**: The current implementation stores passwords **in plain text** for demo purposes:

```typescript
// In src/domain/services.ts
if (user.passwordHash !== password) return null; // Simple string comparison
```

**For production**, this should be replaced with proper password hashing (e.g., bcrypt):

```typescript
const isValid = await bcrypt.compare(password, user.passwordHash);
```

---

## Testing Workflow

### 1. **Reset Database & Start Server**

```bash
npm run db:reset
SEED_DB=true npm run serve  # Or without SEED_DB=true for manual user creation
```

### 2. **Start Frontend** (new terminal)

```bash
cd ui && npm run dev
```

### 3. **Open Browser**

- Navigate to `http://localhost:5173`

### 4. **Login**

- Use credentials from the table above
- Or manually created users

### 5. **Test Use Cases**

- Create classes, students, grades
- Real-time updates via SSE
- Cross-role visibility (student sees grade → parent sees it too)

---

## Troubleshooting Login

**"Invalid credentials" error**

- ✅ Check spelling of username
- ✅ Ensure password matches exactly (passwords are case-sensitive)
- ✅ Verify user was created in database: `SELECT * FROM users;`

**Blank login form, can't submit**

- ✅ Make sure backend is running: `npm run serve`
- ✅ Check backend logs for errors
- ✅ Verify port 43210 is accessible

**Login works but blank dashboard**

- ✅ You may need to create related data (class, section, enrollment)
- ✅ See "Creating Users Manually" section for full setup

**Can't see parent's linked student**

- ✅ Ensure `parent_student_links` table has entry connecting them
- ✅ Verify student ID and parent ID match exactly

---

## User Roles & Permissions

### **Student**

- Can view own grades
- Can view own attendance
- Can view teacher feedback
- Receives messages from teachers (via notifications)

### **Parent**

- Must be linked to a student via `parent_student_links`
- Can view linked student's grades, attendance, discipline, nurse visits
- Can receive messages from teachers
- Can link multiple children (via UI)

### **Teacher**

- Can submit grades for students
- Can mark attendance
- Can give feedback to students
- Can send messages to parents

### **Nurse**

- Can record health visits for students
- Visit records visible to parents

### **Admin**

- Can record discipline actions
- Discipline records visible to parents

---

## Architecture Details

### Authentication Flow

```
User enters username/password
           ↓
Frontend calls POST /api/login
           ↓
Backend AuthService.authenticate()
           ↓
Find user by username in database
           ↓
Compare password (current: plain text)
           ↓
Generate session token (UUID)
           ↓
Save session to database
           ↓
Return token + user info to frontend
           ↓
Frontend stores token (localStorage or session)
           ↓
All API calls include token in headers
           ↓
Backend AuthService.getCurrentUser(token) validates
```

### Session Management

- Sessions expire after **2 hours**
- Token is stored client-side
- Logout deletes session from database
- No token = not authenticated = redirected to login

---

## Quick Reference Commands

```bash
# Full setup with demo data
npm run db:reset && SEED_DB=true npm run serve

# Setup with empty database (manual user creation)
npm run db:reset && npm run serve

# View database users
sqlite3 data/app.db "SELECT id, username, role FROM users;"

# Delete all users (fresh start)
sqlite3 data/app.db "DELETE FROM users;"

# Add single user
sqlite3 data/app.db "INSERT INTO users (id, username, password_hash, role) VALUES ('test-1', 'testuser', 'testpass', 'student');"
```

---

## Next Steps

✅ Start server (with or without seeding)
✅ Login with your chosen role
✅ Create data (classes, grades, etc.)
✅ Test real-time updates (SSE)
✅ Verify use cases work across roles
