import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

/**
 * Root layout. Loaded once per app start. Imports the Tailwind stylesheet
 * so every descendant screen can use NativeWind `className` tokens.
 *
 * No chat wiring here — per-screen ChatProvider scoping lives in the
 * screen file so we can re-mount with a different petId later without
 * tearing down the whole app.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
