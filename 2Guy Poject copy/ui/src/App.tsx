import './App.css';
import { useEffect, useState } from 'react';
import {
  enrollStudentInSection,
  getNotifications,
  getParentDashboard,
  getStudentDashboard,
  linkParentToStudent,
  sendTeacherMessage,
  getSections,
  getStudentSections,
  teacherMarkAttendance,
  nurseRecordVisit,
  adminRecordDiscipline,
  login,
  setAuthToken,
} from './api/client';
import type { SectionDTO } from './api/client';

type DashboardCard = {
  title: string;
  items: { label: string; value: string }[];
};

type GradeEntry = { assignment: string; points: number; comment: string };
type AttendanceEntry = { date: string; status: string };
type FeedbackEntry = { comment: string; createdAt: string };
type NotificationEntry = { message: string; createdAt: string };

const mockDashboardCards: DashboardCard[] = [
  {
    title: 'Grades',
    items: [
      { label: 'Essay', value: '95/100 (Nice work!)' },
      { label: 'Quiz 1', value: '88/100' },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { label: 'Dec 01', value: 'Present' },
      { label: 'Nov 30', value: 'Present' },
    ],
  },
  {
    title: 'Feedback',
    items: [
      { label: 'Math', value: 'Keep it up' },
      { label: 'English', value: 'Great participation' },
    ],
  },
];

const mockNotifications: NotificationEntry[] = [
  { message: 'Grades updated for student Ada Lovelace', createdAt: 'Now' },
  { message: 'Attendance updated for student Ada Lovelace', createdAt: '1m ago' },
];

const mockParentNotifications: NotificationEntry[] = [
  { message: 'Teacher note for parent: Ada is missing assignments in History', createdAt: 'Today' },
  { message: 'Discipline action recorded for Ada: Warning', createdAt: 'Yesterday' },
];

const mockFeedback: FeedbackEntry[] = [
  { comment: 'Keep it up', createdAt: 'Today' },
  { comment: 'Focus on algebra practice', createdAt: 'Yesterday' },
];

type Tab = 'student' | 'parent' | 'teacher' | 'nurse' | 'admin' | 'notifications';

type CurrentUser = {
  id: string;
  username: string;
  role: 'student' | 'parent' | 'teacher' | 'nurse' | 'administrator';
};

function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('student');
  const [studentDashboard, setStudentDashboard] = useState<DashboardCard[]>(mockDashboardCards);
  const [parentDashboard, setParentDashboard] = useState<DashboardCard[]>(mockDashboardCards);
  const [feedbackView] = useState<FeedbackEntry[]>(mockFeedback);
  const [notificationsView, setNotificationsView] = useState<NotificationEntry[]>(mockNotifications);
  const [parentNotificationsView, setParentNotificationsView] = useState<NotificationEntry[]>(mockParentNotifications);
  const [gradebookView] = useState<GradeEntry[]>([
    { assignment: 'Essay', points: 95, comment: 'Nice work!' },
    { assignment: 'Quiz 1', points: 88, comment: '' },
  ]);
  const [attendanceView] = useState<AttendanceEntry[]>([
    { date: 'Dec 1', status: 'Present' },
    { date: 'Nov 30', status: 'Present' },
  ]);
  const [studentId, setStudentId] = useState('');
  const [parentId, setParentId] = useState('');
  const [sectionId, setSectionId] = useState('section-1');
  const [teacherId, setTeacherId] = useState('');
  const [teacherMessage, setTeacherMessage] = useState('Reminder: submit your project draft.');
  const [nurseId, setNurseId] = useState('nurse-1');
  const [adminId, setAdminId] = useState('admin-1');
  const [status, setStatus] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [studentSections, setStudentSections] = useState<SectionDTO[]>([]);

  useEffect(() => {
    if (!user) return;
    const nextStudentId = user.role === 'student' ? user.id : studentId;
    const nextParentId = user.role === 'parent' ? user.id : parentId;
    const nextTeacherId = user.role === 'teacher' ? user.id : teacherId;
    const nextNurseId = user.role === 'nurse' ? user.id : nurseId;
    const nextAdminId = user.role === 'administrator' ? user.id : adminId;

    setStudentId(nextStudentId);
    setParentId(nextParentId);
    setTeacherId(nextTeacherId);
    setNurseId(nextNurseId);
    setAdminId(nextAdminId);

    loadSections();
    if (nextStudentId) {
      loadStudentSections(nextStudentId);
      loadStudent();
      loadNotifications();
    }
    if (nextParentId) {
      loadParent();
    }
  }, [user]);

  const loadStudent = async () => {
    if (!studentId) return;
    const data = await getStudentDashboard(studentId);
    if (!data) return;
    const grades = data.grades ?? [];
    const attendance = data.attendance ?? [];
    const cards: DashboardCard[] = [
      {
        title: 'Grades',
        items: grades.map(g => ({ label: g.assignment, value: `${g.points}${g.comment ? ` (${g.comment})` : ''}` })),
      },
      {
        title: 'Attendance',
        items: attendance.map(a => ({ label: a.date, value: a.status })),
      },
    ];
    setStudentDashboard(cards);
    // Dashboard feedback currently mocked; leave as-is until backend support is added.
  };

  const loadParent = async () => {
    if (!parentId) return;
    const data = await getParentDashboard(parentId);
    if (!data) return;
    const grades = data.grades ?? [];
    const attendance = data.attendance ?? [];
    const cards: DashboardCard[] = [
      {
        title: 'Grades',
        items: grades.map(g => ({ label: g.assignment, value: `${g.points}${g.comment ? ` (${g.comment})` : ''}` })),
      },
      {
        title: 'Attendance',
        items: attendance.map(a => ({ label: a.date, value: a.status })),
      },
    ];
    setParentDashboard(cards);
    const parentNotes = await getNotifications(parentId);
    if (parentNotes) {
      setParentNotificationsView(parentNotes);
    }
  };

  const loadNotifications = async () => {
    if (!studentId) return;
    const data = await getNotifications(studentId);
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
              <input value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
            </label>
            <label className="field">
              Password
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await login(loginUsername, loginPassword);
                if (!res.ok || !(res as any).user || !(res as any).token) {
                  setAuthError((res as any).error ?? 'Login failed');
                  return;
                }
                setAuthError(null);
                setAuthToken((res as any).token);
                setUser((res as any).user as CurrentUser);
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
          <p className="lede">Live dashboards for students, parents, teachers, and admins.</p>
        </div>
        <nav className="tabs">
          <button className={tab === 'student' ? 'active' : ''} onClick={() => setTab('student')}>
            Student Dashboard
          </button>
          <button className={tab === 'parent' ? 'active' : ''} onClick={() => setTab('parent')}>
            Parent Dashboard
          </button>
          <button className={tab === 'teacher' ? 'active' : ''} onClick={() => setTab('teacher')}>
            Teacher Gradebook
          </button>
          <button className={tab === 'nurse' ? 'active' : ''} onClick={() => setTab('nurse')}>
            Nurse
          </button>
          <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
            Admin
          </button>
          <button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>
            Notifications
          </button>
        </nav>
      </header>

      {tab === 'student' && (
        <section className="panel">
          <div className="panel__header">
            <h2>Student Dashboard</h2>
            <span className="badge">Auto-refresh every 30s</span>
          </div>
          <div className="grid">
            {studentDashboard.map((card: DashboardCard) => (
              <div key={card.title} className="card">
                <h3>{card.title}</h3>
                <ul>
                  {card.items.map(item => (
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
              {feedbackView.map(f => (
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
                onChange={e => {
                  const next = e.target.value;
                  setStudentId(next);
                  loadStudentSections(next);
                }}
              />
            </label>
            <label className="field">
              Section ID
              <select value={sectionId} onChange={e => setSectionId(e.target.value)}>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.id} {s.teacherName ? `— ${s.teacherName}` : ''}
                  </option>
                ))}
                {!sections.length && <option value={sectionId}>{sectionId}</option>}
              </select>
            </label>
            <label className="field">
              Parent ID (optional)
              <input value={parentId} onChange={e => setParentId(e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await enrollStudentInSection(studentId, sectionId, parentId || undefined, 'parent');
                const isOfflineDemo = !res.ok && (res.error ?? '').includes('Failed to fetch');

                if (res.ok || isOfflineDemo) {
                  // Treat as successful even if backend is unreachable (demo mode).
                  setStatus(res.ok ? 'Enrollment submitted' : 'Enrollment stored locally (no backend)');

                  // Update local view of student sections so the UI reflects the change.
                  const selected = sections.find(s => s.id === sectionId);
                  if (selected && !studentSections.find(s => s.id === selected.id)) {
                    setStudentSections(prev => [...prev, selected]);
                  }

                  await loadStudent();
                  await loadParent();
                } else {
                  setStatus(`Enrollment failed: ${res.error ?? 'unknown error'}`);
                }
              }}
            >
              Enroll & Link Parent
            </button>
          </div>
          <div className="card">
            <h3>Your Sections</h3>
            <ul>
              {studentSections.map(s => (
                <li key={s.id}>
                  <span>{s.name ?? s.id}</span>
                  <small>{s.teacherName ?? ''}</small>
                </li>
              ))}
              {!studentSections.length && <li>No sections yet</li>}
            </ul>
          </div>
          {status && <div className="status">{status}</div>}
        </section>
      )}

      {tab === 'teacher' && (
        <section className="panel">
          <div className="panel__header">
            <h2>Teacher Gradebook</h2>
            <span className="badge">Section: Algebra 1 - Fall</span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Grades</h3>
              <table>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Points</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {gradebookView.map(row => (
                    <tr key={row.assignment}>
                      <td>{row.assignment}</td>
                      <td>{row.points}</td>
                      <td>{row.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Mark Attendance</h3>
              <ul>
                {attendanceView.map(a => (
                  <li key={a.date}>
                    <span>{a.date}</span>
                    <strong>{a.status}</strong>
                  </li>
                ))}
              </ul>
              <button
                className="primary"
                onClick={async () => {
                  const today = new Date().toISOString();
                  const res = await teacherMarkAttendance(teacherId, sectionId, studentId, today, 'Present');
                  setStatus(res.ok ? 'Attendance recorded' : `Attendance failed: ${res.error ?? 'unknown error'}`);
                  if (res.ok) {
                    await loadStudent();
                    await loadNotifications();
                  }
                }}
              >
                Mark Present Today
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="panel">
          <div className="panel__header">
            <h2>Notifications</h2>
            <span className="badge">Live via DomainEventBus</span>
          </div>
          <div className="card">
            <ul>
              {notificationsView.map(n => (
                <li key={n.message}>
                  <span>{n.message}</span>
                  <small>{n.createdAt}</small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'nurse' && (
        <section className="panel">
          <div className="panel__header">
            <h2>Nurse Console</h2>
            <span className="badge">Record visits</span>
          </div>
          <div className="card">
            <label className="field">
              Nurse ID
              <input value={nurseId} onChange={e => setNurseId(e.target.value)} />
            </label>
            <label className="field">
              Student ID
              <input value={studentId} onChange={e => setStudentId(e.target.value)} />
            </label>
            <label className="field">
              Notes
              <textarea value={teacherMessage} onChange={e => setTeacherMessage(e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await nurseRecordVisit(nurseId, studentId, teacherMessage);
                setStatus(res.ok ? 'Nurse visit recorded' : `Visit failed: ${res.error ?? 'unknown error'}`);
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

      {tab === 'admin' && (
        <section className="panel">
          <div className="panel__header">
            <h2>Admin Console</h2>
            <span className="badge">Discipline actions</span>
          </div>
          <div className="card">
            <label className="field">
              Admin ID
              <input value={adminId} onChange={e => setAdminId(e.target.value)} />
            </label>
            <label className="field">
              Student ID
              <input value={studentId} onChange={e => setStudentId(e.target.value)} />
            </label>
            <label className="field">
              Action Type
              <input value={sectionId} onChange={e => setSectionId(e.target.value)} />
            </label>
            <label className="field">
              Notes
              <textarea value={teacherMessage} onChange={e => setTeacherMessage(e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await adminRecordDiscipline(adminId, studentId, sectionId, teacherMessage);
                setStatus(res.ok ? 'Discipline recorded' : `Discipline failed: ${res.error ?? 'unknown error'}`);
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

      {tab === 'parent' && (
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
                  {card.items.map(item => (
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
            <h3>Parent Notifications</h3>
            <ul>
              {parentNotificationsView.map(n => (
                <li key={n.message}>
                  <span>{n.message}</span>
                  <small>{n.createdAt}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Select / Link Child</h3>
            <label className="field">
              Parent ID
              <input value={parentId} onChange={e => setParentId(e.target.value)} />
            </label>
            <label className="field">
              Child (Student) ID
              <input value={studentId} onChange={e => setStudentId(e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await linkParentToStudent(parentId, studentId, 'parent');
                setStatus(res.ok ? 'Parent linked to student' : `Link failed: ${res.error ?? 'unknown error'}`);
                if (res.ok) {
                  await loadParent();
                }
              }}
            >
              Link Child
            </button>
          </div>
        </section>
      )}

      {tab === 'teacher' && (
        <section className="panel">
          {/* existing gradebook content */}
          <div className="panel__header">
            <h2>Teacher Gradebook</h2>
            <span className="badge">Section: Algebra 1 - Fall</span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Grades</h3>
              <table>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Points</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {gradebookView.map(row => (
                    <tr key={row.assignment}>
                      <td>{row.assignment}</td>
                      <td>{row.points}</td>
                      <td>{row.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Mark Attendance</h3>
              <ul>
                {attendanceView.map(a => (
                  <li key={a.date}>
                    <span>{a.date}</span>
                    <strong>{a.status}</strong>
                  </li>
                ))}
              </ul>
              <button className="primary">Mark Present</button>
            </div>
          </div>
          <div className="card">
            <h3>Send Notification to Student + Parent</h3>
            <label className="field">
              Teacher ID
              <input value={teacherId} onChange={e => setTeacherId(e.target.value)} />
            </label>
            <label className="field">
              Section ID
              <input value={sectionId} onChange={e => setSectionId(e.target.value)} />
            </label>
            <label className="field">
              Student ID
              <input value={studentId} onChange={e => setStudentId(e.target.value)} />
            </label>
            <label className="field">
              Message
              <textarea value={teacherMessage} onChange={e => setTeacherMessage(e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={async () => {
                const res = await sendTeacherMessage(teacherId, studentId, sectionId, teacherMessage);
                setStatus(res.ok ? 'Notification sent' : `Send failed: ${res.error ?? 'unknown error'}`);
                if (res.ok) {
                  await loadNotifications();
                  await loadParent();
                }
              }}
            >
              Send to Student + Parent
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </section>
      )}
    </div>
  );
}

export default App;
