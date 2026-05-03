import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { APP_NAME } from '../config/env';
import { colors, radius, spacing } from '../theme';
import { AppButton, AppInput, AppText, SectionHeader } from '../components/ui/Atoms';
import Screen from '../components/ui/Screen';
import { useAuthStore } from '../store/authStore';

const formDefaults = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  token: '',
  newPassword: '',
};

const demoAccounts = {
  admin: {
    label: 'Admin Demo',
    email: 'admin@example.com',
    password: 'Admin@12345',
  },
  staff: {
    label: 'Staff Demo',
    email: 'staff@example.com',
    password: 'Staff@12345',
  },
  customer: {
    label: 'Customer Demo',
    email: 'customer@example.com',
    password: 'Customer@12345',
  },
};

const authError = (error) => {
  Alert.alert('Request failed', error?.message || 'Please try again.');
};

export function AuthLandingScreen() {
  const navigation = useNavigation();
  const enterGuestMode = useAuthStore((state) => state.enterGuestMode);

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <AppText variant="caption" tone="accent" style={styles.kicker}>
          Premium mobile commerce
        </AppText>
        <AppText variant="title" style={styles.title}>
          {APP_NAME}
        </AppText>
        <AppText tone="muted" style={styles.subtitle}>
          Browse, customize, order, and manage every shirt workflow from a polished mobile experience.
        </AppText>
        <View style={styles.heroActions}>
          <AppButton title="Sign In" onPress={() => navigation.navigate('Login')} />
          <AppButton title="Create Account" onPress={() => navigation.navigate('Register')} variant="ghost" />
          <AppButton title="Continue as Guest" onPress={enterGuestMode} variant="ghost" />
        </View>
      </View>
    </Screen>
  );
}

export function LoginScreen() {
  const navigation = useNavigation();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [values, setValues] = useState(formDefaults);
  const [showPassword, setShowPassword] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState('');

  const goToTabsIfAvailable = () => {
    const state = navigation.getState?.();
    if (state?.routeNames?.includes('Tabs')) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      });
    }
  };

  const submit = async () => {
    try {
      await login({
        email: values.email.trim(),
        password: values.password,
      });
      goToTabsIfAvailable();
    } catch (error) {
      authError(error);
    }
  };

  const loginWithDemo = async (role) => {
    const account = demoAccounts[role];
    if (!account) return;

    setQuickLoginRole(role);
    try {
      await login({
        email: account.email,
        password: account.password,
      });
      goToTabsIfAvailable();
    } catch (error) {
      authError(error);
    } finally {
      setQuickLoginRole('');
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.formShell}>
        <SectionHeader
          title="Welcome back"
          subtitle="Sign in to continue your shopping, orders, and dashboard."
        />
        <View style={styles.formCard}>
          <AppInput
            label="Email"
            value={values.email}
            onChangeText={(email) => setValues((prev) => ({ ...prev, email }))}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <AppInput
            label="Password"
            value={values.password}
            onChangeText={(password) => setValues((prev) => ({ ...prev, password }))}
            secureTextEntry={!showPassword}
            placeholder="Enter your password"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((prev) => !prev)}
            style={{ marginTop: spacing.md }}
          />
          <View style={styles.demoLoginWrap}>
            <AppText tone="muted" style={styles.demoLoginLabel}>
              One-tap demo login
            </AppText>
            <View style={styles.demoLoginGrid}>
              <AppButton
                title={demoAccounts.admin.label}
                variant="ghost"
                onPress={() => loginWithDemo('admin')}
                loading={loading && quickLoginRole === 'admin'}
                disabled={loading}
                style={styles.demoLoginButton}
              />
              <AppButton
                title={demoAccounts.staff.label}
                variant="ghost"
                onPress={() => loginWithDemo('staff')}
                loading={loading && quickLoginRole === 'staff'}
                disabled={loading}
                style={styles.demoLoginButton}
              />
              <AppButton
                title={demoAccounts.customer.label}
                variant="ghost"
                onPress={() => loginWithDemo('customer')}
                loading={loading && quickLoginRole === 'customer'}
                disabled={loading}
                style={styles.demoLoginButton}
              />
            </View>
          </View>
          <AppButton title="Sign In" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
          <View style={styles.linkRow}>
            <AppText tone="muted" onPress={() => navigation.navigate('ForgotPassword')}>
              Forgot password?
            </AppText>
            <AppText tone="accent" onPress={() => navigation.navigate('Register')}>
              Create Account
            </AppText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export function RegisterScreen() {
  const navigation = useNavigation();
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const [values, setValues] = useState(formDefaults);
  const [showPassword, setShowPassword] = useState(false);

  const goToTabsIfAvailable = () => {
    const state = navigation.getState?.();
    if (state?.routeNames?.includes('Tabs')) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      });
    }
  };

  const submit = async () => {
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone.trim(),
        address: values.address.trim(),
      });
      goToTabsIfAvailable();
    } catch (error) {
      authError(error);
    }
  };

  return (
    <Screen scroll>
      <SectionHeader
        title="Create account"
        subtitle="A fast, polished onboarding flow for new customers."
      />
      <View style={styles.formCard}>
        <AppInput
          label="Full name"
          value={values.name}
          onChangeText={(name) => setValues((prev) => ({ ...prev, name }))}
          placeholder="Jane Doe"
        />
        <AppInput
          label="Email"
          value={values.email}
          onChangeText={(email) => setValues((prev) => ({ ...prev, email }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          style={{ marginTop: spacing.md }}
        />
        <AppInput
          label="Password"
          value={values.password}
          onChangeText={(password) => setValues((prev) => ({ ...prev, password }))}
          secureTextEntry={!showPassword}
          placeholder="At least 8 characters"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword((prev) => !prev)}
          style={{ marginTop: spacing.md }}
        />
        <AppInput
          label="Phone"
          value={values.phone}
          onChangeText={(phone) => setValues((prev) => ({ ...prev, phone }))}
          keyboardType="phone-pad"
          placeholder="Optional"
          style={{ marginTop: spacing.md }}
        />
        <AppInput
          label="Address"
          value={values.address}
          onChangeText={(address) => setValues((prev) => ({ ...prev, address }))}
          placeholder="Optional"
          style={{ marginTop: spacing.md }}
        />
        <AppButton title="Create Account" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
      </View>
    </Screen>
  );
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await import('../services/authService').then(({ authService }) =>
        authService.forgotPassword({ email: email.trim() })
      );
      Alert.alert('Success', 'Password reset instructions were requested successfully.');
    } catch (error) {
      authError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Forgot password" subtitle="Request a reset token sent through the backend email flow." />
      <View style={styles.formCard}>
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <AppButton title="Send reset link" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
      </View>
    </Screen>
  );
}

export function ResetPasswordScreen() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { authService } = await import('../services/authService');
      await authService.resetPassword({
        token: token.trim(),
        newPassword,
      });
      Alert.alert('Success', 'Password has been reset. You can sign in now.');
    } catch (error) {
      authError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Reset password" subtitle="Use the token from your email or backend logs." />
      <View style={styles.formCard}>
        <AppInput label="Reset token" value={token} onChangeText={setToken} placeholder="Token" />
        <AppInput
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Enter a new password"
          style={{ marginTop: spacing.md }}
        />
        <AppButton title="Reset password" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kicker: {
    marginBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  heroActions: {
    gap: spacing.md,
  },
  demoLoginWrap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  demoLoginLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  demoLoginGrid: {
    gap: spacing.sm,
  },
  demoLoginButton: {
    width: '100%',
  },
  formShell: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    flex: 1,
  },
  formCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
});
