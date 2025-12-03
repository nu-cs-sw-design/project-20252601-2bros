import { describe, expect, it, vi } from 'vitest';
import { DomainEventBus, GradebookService, AttendanceService, NotificationService, AccessControlService, DashboardService } from '../src/domain/services';
import {
  InMemoryAssignmentRepository,
  InMemoryAttendanceRepository,
  InMemoryDisciplineRepository,
  InMemoryFeedbackRepository,
  InMemoryGradebookRepository,
  InMemoryHealthRepository,
  InMemoryNotificationRepository,
  InMemoryParentRepository,
  InMemoryParentStudentLinkRepository,
  InMemoryRolePermissionRepository,
  InMemorySectionRepository,
  InMemoryStudentRepository,
  InMemoryUserRepository,
} from '../src/datasource/memory';
import { DisciplineAction, NurseVisit, RolePermission, Section, Student, User } from '../src/domain/entities';
import { AttendanceUpdatedEvent, GradesUpdatedEvent } from '../src/domain/events';
import { StudentParentRoutingStrategy } from '../src/domain/notificationRouting';
import { InMemoryParentStudentLinkRepository } from '../src/datasource/memory';

describe('GradebookService', () => {
  it('saves grades and publishes GradesUpdated', async () => {
    const bus = new DomainEventBus();
    const events: GradesUpdatedEvent[] = [];
    bus.subscribe('GradesUpdated', e => events.push(e as GradesUpdatedEvent));
    const gradeRepo = new InMemoryGradebookRepository();
    const assignmentRepo = new InMemoryAssignmentRepository([
      { id: 'assign-1', sectionId: 'sec-1', title: 'Essay', maxPoints: 100, dueDate: '2023-01-01' },
    ]);
    const feedbackRepo = new InMemoryFeedbackRepository();
    const service = new GradebookService(gradeRepo, assignmentRepo, feedbackRepo, bus);

    await service.updateGrade('assign-1', 'student-1', 95, 'Great job');

    const saved = await gradeRepo.findGradesForStudent('student-1');
    expect(saved).toHaveLength(1);
    expect(saved[0]?.points).toBe(95);
    expect(events[0]?.type).toBe('GradesUpdated');
    expect(events[0]?.payload.sectionId).toBe('sec-1');
  });
});

describe('AttendanceService', () => {
  it('marks attendance and publishes AttendanceUpdated', async () => {
    const bus = new DomainEventBus();
    const events: AttendanceUpdatedEvent[] = [];
    bus.subscribe('AttendanceUpdated', e => events.push(e as AttendanceUpdatedEvent));
    const repo = new InMemoryAttendanceRepository();
    const service = new AttendanceService(repo, bus);

    await service.markAttendance('sec-1', 'student-1', '2023-01-02', 'Present', '');

    const records = await repo.findByStudentId('student-1');
    expect(records).toHaveLength(1);
    expect(events[0]?.payload.studentId).toBe('student-1');
  });
});

describe('NotificationService', () => {
  it('stores notifications and can mark them read', async () => {
    const repo = new InMemoryNotificationRepository();
    const bus = new DomainEventBus();
    const links = new InMemoryParentStudentLinkRepository([{ parentId: 'parent-1', studentId: 'student-1', relationship: 'mother' }]);
    const service = new NotificationService(repo, bus, new StudentParentRoutingStrategy(links));

    await service.notify({
      type: 'GradesUpdated',
      occurredAt: new Date().toISOString(),
      payload: { studentId: 'student-1', sectionId: 'sec-1' },
    });
    const listStudent = await service.list('student-1');
    const listParent = await service.list('parent-1');
    expect(listStudent).toHaveLength(1);
    expect(listParent).toHaveLength(1);
    expect(listStudent[0]?.read).toBe(false);

    await service.markRead(listStudent[0]!.id);
    const updated = await service.list('student-1');
    expect(updated[0]?.read).toBe(true);
  });
});

describe('AccessControlService', () => {
  it('allows when permission exists', async () => {
    const user: User = { id: 'u1', username: 't', passwordHash: 'pw', role: 'teacher' };
    const perm: RolePermission = { role: 'teacher', permission: 'grade:update' };
    const users = new InMemoryUserRepository([user]);
    const perms = new InMemoryRolePermissionRepository([perm]);
    const svc = new AccessControlService(perms, users);
    await expect(svc.authorize('u1', 'grade:update')).resolves.toBe(true);
    await expect(svc.authorize('u1', 'attendance:mark')).resolves.toBe(false);
  });
});

describe('DashboardService', () => {
  it('builds a student dashboard view model', async () => {
    const students = new InMemoryStudentRepository([{ id: 's1', name: 'Ada' } as Student]);
    const parents = new InMemoryParentRepository([]);
    const parentLinks = new InMemoryParentStudentLinkRepository([]);
    const sections = new (class extends InMemorySectionRepository {
      findByStudentId() {
        const section: Section = { id: 'sec-1', classId: 'c1', teacherId: 't1', term: 'Fall' };
        return Promise.resolve([section]);
      }
    })();
    const gradebook = new InMemoryGradebookRepository([{ id: 'g1', assignmentId: 'assign-1', studentId: 's1', points: 90, comment: '' }]);
    const attendance = new InMemoryAttendanceRepository([
      { id: 'a1', studentId: 's1', sectionId: 'sec-1', date: '2023-01-01', status: 'Present', reason: '' },
    ]);
    const feedback = new InMemoryFeedbackRepository([]);
    const health = new InMemoryHealthRepository([{ id: 'h1', studentId: 's1', nurseId: 'n1', visitTime: '2023', notes: '' } as NurseVisit]);
    const discipline = new InMemoryDisciplineRepository([{ id: 'd1', studentId: 's1', adminId: 'adm', date: '2023', actionType: 'Warning', notes: '' } as DisciplineAction]);

    const svc = new DashboardService(
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

    const vm = await svc.buildDashboardForStudent('s1');
    expect(vm.studentName).toBe('Ada');
    expect((vm.gradesSummary as unknown[]).length).toBe(1);
    expect((vm.attendanceSummary as unknown[]).length).toBe(1);
    expect((vm.healthSummary as unknown[]).length).toBe(1);
    expect((vm.disciplineSummary as unknown[]).length).toBe(1);
  });
});
