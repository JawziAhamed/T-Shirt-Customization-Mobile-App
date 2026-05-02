import { create } from 'zustand';

import { authService } from '../services/authService';
import { authTokenStore } from '../services/authToken';
import { sessionStorage } from '../services/sessionStorage';

export const useAuthStore = create((set, get) => ({
  token: '',
  user: null,
  loading: false,
  hydrated: false,
  guestMode: false,

  isAuthenticated: () => Boolean(get().token),
  isGuest: () => !get().token && get().guestMode,
  hasRole: (roles = []) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role);
  },

  bootstrap: async () => {
    set({ loading: true });

    try {
      const [token, user, guestMode] = await Promise.all([
        sessionStorage.getAuthToken(),
        sessionStorage.getAuthUser(),
        sessionStorage.getGuestMode(),
      ]);
      if (token) {
        authTokenStore.setAuthToken(token);
        set({ token, user, guestMode: false });

        try {
          const { data } = await authService.me();
          set({ user: data.user, token, guestMode: false, hydrated: true });
          await Promise.all([
            sessionStorage.setAuthToken(token),
            sessionStorage.setAuthUser(data.user),
            sessionStorage.setGuestMode(false),
          ]);
          return;
        } catch (error) {
          await sessionStorage.clearAuth();
          authTokenStore.clearAuthToken();
          set({ token: '', user: null });
        }
      } else {
        authTokenStore.clearAuthToken();
        set({ token: '', user: null, guestMode: guestMode === '1' });
      }
    } finally {
      set({ loading: false, hydrated: true });
    }
  },

  setSession: async ({ token, user }) => {
    authTokenStore.setAuthToken(token);
    await Promise.all([
      sessionStorage.setAuthToken(token),
      sessionStorage.setAuthUser(user),
      sessionStorage.setGuestMode(false),
    ]);
    set({ token, user, guestMode: false });
  },

  clearSession: async () => {
    authTokenStore.clearAuthToken();
    await sessionStorage.clearAuth();
    set({ token: '', user: null });
  },

  enterGuestMode: async () => {
    await sessionStorage.setGuestMode(true);
    set({ guestMode: true });
  },

  exitGuestMode: async () => {
    await sessionStorage.setGuestMode(false);
    set({ guestMode: false });
  },

  register: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await authService.register(payload);
      await get().setSession({ token: data.token, user: data.user });
      return data;
    } finally {
      set({ loading: false });
    }
  },

  login: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await authService.login(payload);
      await get().setSession({ token: data.token, user: data.user });
      return data;
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async () => {
    if (!get().token) return null;

    set({ loading: true });
    try {
      const { data } = await authService.me();
      await get().setSession({ token: get().token, user: data.user });
      return data.user;
    } catch (error) {
      await get().clearSession();
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await authService.updateProfile(payload);
      await get().setSession({ token: get().token, user: data.user });
      return data;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignore logout network failures.
    }

    await get().clearSession();
    await get().enterGuestMode();
  },
}));
