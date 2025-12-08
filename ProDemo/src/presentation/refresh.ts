export interface RefreshStrategy<TView, TController> {
  refresh(view: TView, controller: TController): void;
}

// Push-based refresh triggers immediate reload.
export class PushRefreshStrategy<TView, TController> implements RefreshStrategy<TView, TController> {
  refresh(_view: TView, controller: TController & { reloadLastContext: () => void }) {
    controller.reloadLastContext();
  }
}

// Polling refresh sets an interval to reload periodically.
export class PollingRefreshStrategy<TView, TController> implements RefreshStrategy<TView, TController> {
  private intervalId?: NodeJS.Timeout;
  constructor(private intervalMs = 30000) {}

  refresh(_view: TView, controller: TController & { reloadLastContext: () => void }) {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => controller.reloadLastContext(), this.intervalMs);
    } else {
      controller.reloadLastContext();
    }
  }
}
