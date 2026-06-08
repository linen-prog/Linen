// Linen-aesthetic onboarding colors — fixed, not system-dark-mode-dependent.
// Using hardcoded values so onboarding renders identically in both light and
// dark system modes.
export function useOnboardingColors() {
  return {
    primary: "#8FA381",   // Logo sage
    background: "#fafaf9", // Stone 50
    text: "#1c1917",       // Stone 900
    card: "#f5f5f4",       // Stone 100
    border: "#e7e5e4",     // Stone 200
  };
}
