import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          // Always hide the native Stack header — both index.tsx and index.ios.tsx
          // render their own full custom header with SafeAreaView edges={['top']}.
          // On iOS TestFlight the native header was overlapping the custom header
          // and hiding the NotificationButton (Love Messages icon).
          headerShown: false,
        }}
      />
    </Stack>
  );
}
