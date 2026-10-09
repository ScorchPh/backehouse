import { apiRequest } from './apiClient';

const USER_STORAGE_KEY = 'bakehouse_active_user';

export const authService = {
  async login(usernameOrEmail, password) {
    const data = await apiRequest('/auth/login.php', {
      method: 'POST',
      body: {
        username: usernameOrEmail,
        password: password,
      },
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async register(registrationData) {
    const data = await apiRequest('/auth/register.php', {
      method: 'POST',
      body: registrationData,
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async googleLogin(googleProfile) {
    const data = await apiRequest('/auth/google_login.php', {
      method: 'POST',
      body: googleProfile,
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async updateProfile(profileData) {
    const data = await apiRequest('/auth/update_profile.php', {
      method: 'POST',
      body: profileData,
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('authChange'));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
  },

  logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new Event('authChange'));
  },

  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  async getCustomers() {
    return await apiRequest('/auth/customers.php', { method: 'GET' });
  }
};
