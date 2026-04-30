// TEMPORARY GOOGLE PLAY CLOSED TESTING BYPASS — REMOVE BEFORE PRODUCTION
import AsyncStorage from '@react-native-async-storage/async-storage';

const TESTER_BYPASS_KEY = 'gp_tester_bypass_v1';

export async function setTesterBypass(): Promise<void> {
  await AsyncStorage.setItem(TESTER_BYPASS_KEY, 'true');
}

export async function getTesterBypass(): Promise<boolean> {
  const val = await AsyncStorage.getItem(TESTER_BYPASS_KEY);
  return val === 'true';
}

export async function clearTesterBypass(): Promise<void> {
  await AsyncStorage.removeItem(TESTER_BYPASS_KEY);
}
