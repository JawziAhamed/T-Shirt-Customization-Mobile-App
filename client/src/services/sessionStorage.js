import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const GUEST_MODE_KEY = 'guest_mode';

export const sessionStorage = {
  async getAuthToken() {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async setAuthToken(token) {
    if (!token) {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      return;
    }

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, String(token));
  },

  async getAuthUser() {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  },

  async setAuthUser(user) {
    if (!user) {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      return;
    }

    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  async clearAuth() {
    await Promise.all([SecureStore.deleteItemAsync(AUTH_TOKEN_KEY), AsyncStorage.removeItem(AUTH_USER_KEY)]);
  },

  async getGuestMode() {
    return AsyncStorage.getItem(GUEST_MODE_KEY);
  },

  async setGuestMode(enabled) {
    if (enabled) {
      await AsyncStorage.setItem(GUEST_MODE_KEY, '1');
      return;
    }

    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  },
};
