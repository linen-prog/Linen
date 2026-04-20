/**
 * Module-level flag that records whether the user has explicitly skipped
 * the paywall in the current app session.
 *
 * Using a standalone module (not _layout.tsx) avoids circular imports
 * between paywall.tsx and the root layout.
 */

let _skipped = false;

export function setPaywallSkipped(value: boolean): void {
  _skipped = value;
}

export function isPaywallSkipped(): boolean {
  return _skipped;
}
