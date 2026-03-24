
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

export default function TabLayout() {
  useSubscriptionGuard();
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="home" name="index">
        <Icon sf="house.fill" />
        <Label>Linen</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="community" name="community">
        <Icon sf="person.3.fill" />
        <Label>Community</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="profile" name="profile">
        <Icon sf="person.circle.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
