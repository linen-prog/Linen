// In-memory session flag — resets on app restart.
let _dismissed = false;

export function setPaywallDismissed(value: boolean): void {
  _dismissed = value;
}

export function isPaywallDismissed(): boolean {
  return _dismissed;
}
