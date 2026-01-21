import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="home" name="index">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="community" name="community">
        <Icon sf="person.3.fill" />
        <Label>Community</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
