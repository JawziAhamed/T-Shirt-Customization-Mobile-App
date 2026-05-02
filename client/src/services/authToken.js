let authToken = '';

export const authTokenStore = {
  getAuthToken() {
    return authToken;
  },

  setAuthToken(token) {
    authToken = token ? String(token) : '';
  },

  clearAuthToken() {
    authToken = '';
  },
};
