import { KnownDomainEvent } from './events';
import { ParentStudentLinkRepository } from '../datasource/repositories';

export interface NotificationRoutingStrategy {
  recipientsFor(event: KnownDomainEvent): Promise<string[]>;
}

// Notify student and linked parents (if any).
export class StudentParentRoutingStrategy implements NotificationRoutingStrategy {
  constructor(private parentStudentLinks: ParentStudentLinkRepository) {}

  async recipientsFor(event: KnownDomainEvent): Promise<string[]> {
    const payload = event.payload as { studentId?: string };
    if (!payload.studentId) return [];
    const studentId = payload.studentId;
    const parents = await this.parentStudentLinks.findByStudentId(studentId);
    const parentIds = parents ? parents.map(link => link.parentId) : [];
    return [studentId, ...parentIds];
  }

  async recipientsForStudentAndParents(studentId: string): Promise<string[]> {
    const parents = await this.parentStudentLinks.findByStudentId(studentId);
    const parentIds = parents ? parents.map(link => link.parentId) : [];
    return [studentId, ...parentIds];
  }
}
