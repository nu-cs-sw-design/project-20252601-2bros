// Domain events used by the observer pattern.
export interface DomainEvent {
  type: string;
  occurredAt: string;
  payload: unknown;
}

export interface GradesUpdatedEvent extends DomainEvent {
  type: 'GradesUpdated';
  payload: { studentId: string; sectionId: string };
}

export interface AttendanceUpdatedEvent extends DomainEvent {
  type: 'AttendanceUpdated';
  payload: { studentId: string };
}

export interface NurseVisitLoggedEvent extends DomainEvent {
  type: 'NurseVisitLogged';
  payload: { studentId: string; notes?: string };
}

export interface DisciplineRecordedEvent extends DomainEvent {
  type: 'DisciplineRecorded';
  payload: { studentId: string };
}

export type KnownDomainEvent =
  | GradesUpdatedEvent
  | AttendanceUpdatedEvent
  | NurseVisitLoggedEvent
  | DisciplineRecordedEvent;
