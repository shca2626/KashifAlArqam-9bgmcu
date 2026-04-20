// Powered by OnSpace.AI
// permissions.tsx is no longer the primary consent screen.
// All first-run consent, phone verification, and auto-sync live in /onboarding.
// This file redirects existing deep links to /onboarding for backward compatibility.
import { Redirect } from 'expo-router';

export default function PermissionsScreen() {
  return <Redirect href="/onboarding" />;
}
