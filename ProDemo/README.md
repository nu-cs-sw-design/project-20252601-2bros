# School Engagement Platform Skeleton

This repo contains a minimal TypeScript-style skeleton that implements the UML design (presentation MVC, domain services/entities, datasource repositories, observer + strategy patterns).

## Structure
- `src/domain`: entities, events, strategies (search/export), and services wired to a simple event bus.
- `src/datasource`: repository interfaces and in-memory implementations for quick runs/tests.
- `src/presentation`: view models, controllers, and console-based views to demonstrate flow.

## How to extend
1. Pick a runtime (Node/TS) and add `package.json` + `tsconfig.json`.
2. Replace the in-memory repositories with real persistence (SQL/NoSQL) and wire them into the services.
3. Swap console views with real UI screens (web/mobile) while keeping controllers/viewmodels intact.
4. Implement real auth (password hashing, session expiry), permission checks in controllers using `AccessControlService`.
5. Add push transport (websockets/SSE) to forward `DomainEventBus` events for sub-10s feedback + 30s freshness.

## Demo wiring idea
Instantiate the in-memory repos, services, and controllers, then call controller methods to exercise flows:
```ts
const bus = new DomainEventBus();
const gradebookService = new GradebookService(
  new InMemoryGradebookRepository(),
  new InMemoryAssignmentRepository(),
  new InMemoryFeedbackRepository(),
  bus,
);
const view = new TeacherGradebookView();
const controller = new GradebookController(gradebookService, view);
await controller.updateGrade('assignment-1', 'student-1', 90, 'Great job');
```
