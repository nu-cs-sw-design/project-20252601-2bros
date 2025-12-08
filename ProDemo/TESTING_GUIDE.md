# Testing Guide - Clean Database & Use Cases

## Database State

The application now starts with a **completely empty database** by default. No hardcoded demo data is seeded automatically.

### Reset Database (Start Fresh)

```bash
npm run db:reset
```

This deletes the existing database and recreates the schema from migrations.

### Run with Empty Database

```bash
npm run serve
```

Backend starts on `http://` with an empty database ready for testing.

In a separate terminal:

```bash
cd ui && npm run dev
```

Frontend starts on `http://l` (or next available port).

---

## Testing Use Cases

### Option 1: Manual Data Entry (Recommended for Testing)

1. **Reset database**: `npm run db:reset`
2. **Start servers**:
   - Terminal 1: `npm run serve` (backend)
   - Terminal 2: `cd ui && npm run dev` (frontend)
3. **Create test data manually** via the UI:
   - Login (any username/password - server accepts all for now)
   - Create classes, sections, students, parents
   - Test each use case with fresh data

### Option 2: Seeded Demo Data (For Quick Testing)

If you want demo data for convenience:

```bash
SEED_DB=true npm run serve
```

This will:

- Delete existing database
- Apply migrations (schema)
- Seed demo users:
  - `teacher` / `pw` (role: teacher)
  - `student` / `pw` (role: student)
  - `parent` / `pw` (role: parent)
  - `nurse` / `pw` (role: nurse)
  - `admin` / `pw` (role: administrator)
- Create demo class, section, assignment, and links

---

## Use Cases to Test

### 1. Student Views Enrolled Classes & Teachers

- **User**: student / pw
- **Action**: Dashboard automatically shows enrolled classes
- **Verify**: Section name, class name, teacher name displayed

### 2. Student/Parent Views Grades

- **Users**: student / pw AND parent / pw
- **Setup**: Teacher marks a grade (see Use Case 6)
- **Verify**: Grade appears instantly on student AND parent dashboards (no refresh needed)

### 3. Student/Parent Sees Teacher Feedback

- **Users**: student / pw AND parent / pw
- **Setup**: Teacher sends feedback (see Use Case 7)
- **Verify**: Feedback appears in notifications (real-time via SSE)

### 4. Parent Views Attendance & Discipline

- **User**: parent / pw
- **Setup**: Teacher marks attendance (Use Case 8), Admin records discipline (Use Case 11)
- **Verify**: Both appear on parent dashboard instantly

### 5. Parent Views Nurse Visits

- **User**: parent / pw
- **Setup**: Nurse records visit (Use Case 9)
- **Verify**: Visit appears on parent dashboard (real-time via SSE)

### 6. Teacher Updates Grades

- **User**: teacher / pw
- **Action**:
  1 Enter Assignment ID and Points
  2. Click "Add/Update Grade"
- **Verify**:
  - Teacher sees success message
  - **Real-time**: Student and parent dashboards update without refresh (SSE)

### 7. Teacher Gives Feedback to Student

- **User**: teacher / pw
- **Action**:
  1. Enter feedback text
  2. Click "Send Feedback to Student Only"
- **Verify**:
  - Feedback appears in student's notifications (real-time via SSE)

### 8. Teacher Logs Attendance

- **User**: teacher / pw
- **Action**:
  1. Select a student
  2. Select section
  3. Click "Mark Attendance" button
- **Verify**:
  - Student sees attendance record
  - Parent sees attendance on dashboard (real-time via SSE)

### 9. Nurse Records Visit

- **User**: nurse / pw
- **Action**:
  1. Select a student from dropdown
  2. Click "Record Visit"
- **Verify**:
  - Visit logged to database
  - Parent sees visit on dashboard (real-time via SSE)

### 10. Admin Records Discipline

- **User**: admin / pw
- **Action**:
  1. Select a student from dropdown
  2. Enter infraction type
  3. Click "Record Discipline"
- **Verify**:
  - Discipline record saved
  - Parent sees on dashboard (real-time via SSE)

### 11. Parent Links Child to Account

- **User**: parent / pw
- **Action**:
  1. Go to Parent section
  2. Enter student ID (e.g., "student-1")
  3. Click "Link Child"
- **Verify**:
  - Parent dashboard now shows linked child's data
  - Real-time updates work for linked child

### 12. Real-Time Updates (SSE)

- **Test**: All above use cases
- **Verify**:
  - Open two browser windows (e.g., student + parent)
  - Teacher marks a grade
  - **Both dashboards update instantly without page refresh**
  - No polling delays
  - No manual "Refresh" button clicks needed

---

## Key Testing Points

✅ **No hardcoded data** 

---

## Troubleshooting

## Architecture Notes

See `DESIGN_VS_IMPLEMENTATION.md` for complete architecture verification.

Key patterns:

- **Repository Pattern**: Data access abstraction
- **Domain Event Bus**: Async event handling
- **SSE (Server-Sent Events)**: Real-time push updates
- **Strategy Pattern**: Pluggable notification routing
- **Layered Architecture**: Presentation → Domain → Datasource

## Development Commands

```bash
# Reset database and start fresh
npm run db:reset

# Start backend (empty database)
npm run serve

# Start backend with demo data
SEED_DB=true npm run serve

# Start frontend (in ui/ directory)
cd ui && npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run demo in-memory version
npm run demo

# Run demo SQLite version
npm run demo:sqlite
```
