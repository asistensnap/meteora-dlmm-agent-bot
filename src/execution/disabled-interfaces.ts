export interface DlmmPositionManager {
  readonly enabled: false;
  createPosition(): never;
}

export interface SemiAutoExecution {
  readonly enabled: false;
  requestApproval(): never;
}

export interface RebalanceManager {
  readonly enabled: false;
  rebalance(): never;
}

export const disabledExecutionNotice = "Real DLMM deposits, semi-auto execution, and rebalancing are disabled in version 1.";
