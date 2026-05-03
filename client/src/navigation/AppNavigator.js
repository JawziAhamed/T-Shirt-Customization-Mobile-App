import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppButton, AppCard, AppText } from '../components/ui/Atoms';
import { colors, radius, spacing } from '../theme';
import { useAuthStore } from '../store/authStore';
import { AuthRequiredState } from '../components/ui/States';
import {
  AuthLandingScreen,
  ForgotPasswordScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
} from '../screens/authScreens';
import {
  CartScreen,
  CheckoutScreen,
  HomeScreen,
  ProductDetailsScreen,
  ProductsScreen,
} from '../screens/publicScreens';
import {
  ComplaintsScreen,
  NotificationsScreen,
  OrderDetailsScreen,
  OrdersScreen,
  ProfileScreen,
  ReturnsScreen,
} from '../screens/customerScreens';
import {
  AdminNotificationsScreen,
  AnalyticsScreen,
  DashboardScreen,
  GiftCardsScreen,
  InventoryScreen,
  OrdersAdminScreen,
  ProductsAdminScreen,
  PromosScreen,
  ReportsScreen,
  ReturnsComplaintsScreen,
  UsersScreen,
} from '../screens/adminScreens';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const guestMenuItems = [
  { label: 'Browse Products', description: 'Explore the catalog and add items to cart.', screen: 'Products', icon: 'tshirt-crew-outline' },
  { label: 'Cart', description: 'Review saved items before checkout.', screen: 'Cart', icon: 'cart-outline' },
  { label: 'Sign In', description: 'Unlock orders, checkout, and account tools.', screen: 'Login', icon: 'login' },
  { label: 'Create Account', description: 'Set up your account for order tracking.', screen: 'Register', icon: 'account-plus-outline' },
];

const customerMenuItems = [
  { label: 'Notifications', description: 'Updates from orders and promos.', screen: 'Notifications', icon: 'bell-outline' },
  { label: 'Returns', description: 'Request returns and refunds.', screen: 'Returns', icon: 'backup-restore' },
  { label: 'Complaints', description: 'Raise support issues.', screen: 'Complaints', icon: 'message-alert-outline' },
  { label: 'Profile', description: 'Edit your account and password.', screen: 'Profile', icon: 'account-outline' },
];

const adminMenuItems = [
  { label: 'Analytics', description: 'Operational dashboards.', screen: 'Analytics', icon: 'chart-box-outline' },
  { label: 'Users', description: 'Manage all accounts.', screen: 'Users', icon: 'account-multiple-outline' },
  { label: 'Inventory', description: 'Stock and thresholds.', screen: 'Inventory', icon: 'archive-outline' },
  { label: 'Returns & Complaints', description: 'Handle service workflows.', screen: 'ReturnsComplaints', icon: 'chat-alert-outline' },
  { label: 'Gift Cards', description: 'Store credit management.', screen: 'GiftCards', icon: 'credit-card-outline' },
  { label: 'Promos', description: 'Discount campaigns.', screen: 'Promos', icon: 'ticket-percent-outline' },
  { label: 'Reports', description: 'Sales and support summaries.', screen: 'Reports', icon: 'file-chart-outline' },
  { label: 'Notifications', description: 'System alerts.', screen: 'Notifications', icon: 'bell-outline' },
  { label: 'Profile', description: 'Edit your account.', screen: 'Profile', icon: 'account-outline' },
];

function AuthPromptScreen({ title, subtitle, actionLabel = 'Sign In', onAction }) {
  return (
    <Screen scroll>
      <AuthRequiredState title={title} description={subtitle} actionLabel={actionLabel} onAction={onAction} />
    </Screen>
  );
}

function RequireAuth({ title, subtitle, actionLabel, children }) {
  const navigation = useNavigation();
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return (
      <AuthPromptScreen
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        onAction={() => navigation.navigate('Login')}
      />
    );
  }

  return children;
}

function MenuScreen({ title, subtitle, items, onLogout }) {
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <SectionHeader title={title} subtitle={subtitle} />
      <View style={{ gap: spacing.md }}>
        {items.map((item) => (
          <Pressable key={item.screen} onPress={() => navigation.navigate(item.screen)} style={({ pressed }) => [styles.menuCard, pressed && styles.menuPressed]}>
            <View style={styles.menuIcon}>
              <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
          </Pressable>
        ))}
        <AppButton title="Sign Out" variant="ghost" onPress={onLogout} style={{ marginTop: spacing.md }} />
      </View>
    </Screen>
  );
}

function CustomerMoreScreen() {
  const logout = useAuthStore((state) => state.logout);
  return <MenuScreen title="More" subtitle="Customer support, notifications, and profile tools." items={customerMenuItems} onLogout={logout} />;
}

function AdminMoreScreen() {
  const logout = useAuthStore((state) => state.logout);
  return <MenuScreen title="Admin Tools" subtitle="Operational shortcuts for staff and administrators." items={adminMenuItems} onLogout={logout} />;
}

function GuestMoreScreen() {
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <SectionHeader title="Explore as Guest" subtitle="Browse products and build your cart, then sign in when you're ready to checkout." />
      <View style={{ gap: spacing.md }}>
        {guestMenuItems.map((item) => (
          <Pressable key={item.screen} onPress={() => navigation.navigate(item.screen)} style={({ pressed }) => [styles.menuCard, pressed && styles.menuPressed]}>
            <View style={styles.menuIcon}>
              <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
          </Pressable>
        ))}
        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Guest perks
          </AppText>
          <View style={{ gap: 8 }}>
            <AppText tone="muted">• Browse the homepage and catalog</AppText>
            <AppText tone="muted">• Add custom shirts to your cart</AppText>
            <AppText tone="muted">• Sign in later to checkout and track orders</AppText>
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundAlt,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: 8,
          height: 68,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tshirt-crew-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartStackNavigator}
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt-text-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={CustomerMoreScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function GuestTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundAlt,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: 8,
          height: 68,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tshirt-crew-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartStackNavigator}
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={GuestMoreScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundAlt,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: 8,
          height: 68,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProductsAdmin"
        component={ProductsAdminScreen}
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tshirt-crew-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersAdmin"
        component={OrdersAdminScreen}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MoreAdmin"
        component={AdminMoreScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function CartStackNavigator() {
  return (
    <CartStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.backgroundAlt,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTopInsetEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <CartStack.Screen name="CartHome" component={CartScreen} options={{ title: 'Cart' }} />
    </CartStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Landing" component={AuthLandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const user = useAuthStore((state) => state.user);
  const guestMode = useAuthStore((state) => state.guestMode);
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const TabsComponent = guestMode ? GuestTabs : isAdmin ? AdminTabs : CustomerTabs;

  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.backgroundAlt,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTopInsetEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <RootStack.Screen
        name="Tabs"
        component={TabsComponent}
        options={{ headerShown: false }}
      />
      <RootStack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product Details' }} />
      <RootStack.Screen
        name="Checkout"
        options={{ title: 'Checkout' }}
        children={() => (
          <RequireAuth
            title="Checkout requires sign in"
            subtitle="Sign in to place orders, apply payments, and track delivery."
            actionLabel="Sign In to Checkout"
          >
            <CheckoutScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="OrderDetails"
        options={{ title: 'Order Details' }}
        children={() => (
          <RequireAuth
            title="Order history is private"
            subtitle="Sign in to view your order details and payment status."
            actionLabel="View Orders"
          >
            <OrderDetailsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Notifications"
        options={{ title: 'Notifications' }}
        children={() => (
          <RequireAuth
            title="Notifications require an account"
            subtitle="Sign in to see order updates, promos, and system notices."
            actionLabel="Sign In"
          >
            {isAdmin ? <AdminNotificationsScreen /> : <NotificationsScreen />}
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Returns"
        options={{ title: 'Returns' }}
        children={() => (
          <RequireAuth
            title="Returns require sign in"
            subtitle="Use your account to request returns and refunds."
            actionLabel="Sign In"
          >
            <ReturnsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Complaints"
        options={{ title: 'Complaints' }}
        children={() => (
          <RequireAuth
            title="Complaints require sign in"
            subtitle="Sign in to submit and track support issues."
            actionLabel="Sign In"
          >
            <ComplaintsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Profile"
        options={{ title: 'Profile' }}
        children={() => (
          <RequireAuth
            title="Profile access requires sign in"
            subtitle="Sign in to edit your account details and password."
            actionLabel="Sign In"
          >
            <ProfileScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Analytics"
        options={{ title: 'Analytics' }}
        children={() => (
          <RequireAuth
            title="Analytics require staff access"
            subtitle="Sign in with a staff or admin account to view dashboards."
            actionLabel="Sign In"
          >
            <AnalyticsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Users"
        options={{ title: 'Users' }}
        children={() => (
          <RequireAuth
            title="User management requires staff access"
            subtitle="Sign in with an admin account to manage users."
            actionLabel="Sign In"
          >
            <UsersScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Inventory"
        options={{ title: 'Inventory' }}
        children={() => (
          <RequireAuth
            title="Inventory requires staff access"
            subtitle="Sign in with a staff account to manage stock."
            actionLabel="Sign In"
          >
            <InventoryScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="ReturnsComplaints"
        options={{ title: 'Returns & Complaints' }}
        children={() => (
          <RequireAuth
            title="Support tools require staff access"
            subtitle="Sign in with a staff account to manage service workflows."
            actionLabel="Sign In"
          >
            <ReturnsComplaintsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="GiftCards"
        options={{ title: 'Gift Cards' }}
        children={() => (
          <RequireAuth
            title="Gift cards require staff access"
            subtitle="Sign in with a staff account to manage store credit."
            actionLabel="Sign In"
          >
            <GiftCardsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Promos"
        options={{ title: 'Promos' }}
        children={() => (
          <RequireAuth
            title="Promos require staff access"
            subtitle="Sign in with a staff account to manage campaigns."
            actionLabel="Sign In"
          >
            <PromosScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen
        name="Reports"
        options={{ title: 'Reports' }}
        children={() => (
          <RequireAuth
            title="Reports require staff access"
            subtitle="Sign in with a staff account to view reports."
            actionLabel="Sign In"
          >
            <ReportsScreen />
          </RequireAuth>
        )}
      />
      <RootStack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
      <RootStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
      <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const guestMode = useAuthStore((state) => state.guestMode);

  if (!hydrated) {
    return (
      <Screen scroll={false}>
        <Loader label="Opening the app..." />
      </Screen>
    );
  }

  return <NavigationContainer>{token || guestMode ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
}

function Screen({ children, scroll = true }) {
  if (scroll) {
    return (
      <ScrollView contentContainerStyle={styles.loaderWrap}>
        {children}
      </ScrollView>
    );
  }

  return <View style={styles.loaderWrap}>{children}</View>;
}

function Loader({ label }) {
  return (
    <View style={styles.loaderCenter}>
      <AppText variant="subtitle" style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </View>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  loaderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88,213,255,0.12)',
  },
  menuTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  menuDesc: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  authPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authPromptTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  authPromptSubtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },
});
