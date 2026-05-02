import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import Screen from '../components/ui/Screen';
import { AppBadge, AppButton, AppCard, AppInput, AppPicker, AppText, SectionHeader } from '../components/ui/Atoms';
import { EmptyState, Loader } from '../components/ui/States';
import StatCard from '../components/features/StatCard';
import { analyticsService } from '../services/analyticsService';
import { authService } from '../services/authService';
import { giftCardService } from '../services/giftCardService';
import { inventoryService } from '../services/inventoryService';
import { complaintService } from '../services/complaintService';
import { notificationService } from '../services/notificationService';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { promoService } from '../services/promoService';
import { returnService } from '../services/returnService';
import { userService } from '../services/userService';
import { colors, radius, spacing } from '../theme';
import { currency, relativeTime, shortDate, statusColor, titleCase } from '../utils/format';
import { resolveProductImageUrl } from '../utils/image';

const imageToFormFile = (asset, name = 'upload.jpg') => ({
  uri: asset.uri,
  name,
  type: asset.mimeType || 'image/jpeg',
});

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ADMIN_QUICK_ACTIONS = [
  { label: 'Add Product', subtitle: 'Create or edit catalog items', screen: 'ProductsAdmin', icon: 'tshirt-crew-outline' },
  { label: 'Manage Orders', subtitle: 'Review statuses and progress', screen: 'OrdersAdmin', icon: 'clipboard-text-outline' },
  { label: 'View Reports', subtitle: 'Sales, returns, and stock PDF reports', screen: 'Reports', icon: 'file-chart-outline' },
  { label: 'Notifications', subtitle: 'Monitor alerts and updates', screen: 'Notifications', icon: 'bell-outline' },
];

function formatMonthLabel(entry, fallbackIndex) {
  if (!entry?._id) return MONTH_LABELS[fallbackIndex % 12];
  return MONTH_LABELS[(Number(entry._id.month) - 1 + 12) % 12];
}

function MiniBarChart({ data = [] }) {
  const source = Array.isArray(data) ? data : [];
  const series = source.map((item, index) => ({
    label: formatMonthLabel(item, index),
    value: Number(item?.sales || 0),
  }));
  const max = series.reduce((highest, item) => Math.max(highest, item.value), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartHeaderText}>
          <Text style={styles.chartTitle}>Revenue trend</Text>
          <Text style={styles.chartSubtitle}>Monthly sales performance for the last 12 months.</Text>
        </View>
        <View style={styles.chartPill}>
          <Text style={styles.chartPillText}>Live trend</Text>
        </View>
      </View>
      <View style={styles.chartBars}>
        {series.length ? (
          series.map((item) => {
            const heightPx = Math.max((item.value / max) * 96, item.value > 0 ? 14 : 6);
            return (
              <View key={item.label} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartFill, { height: heightPx }]} />
                </View>
                <Text style={styles.chartValue} numberOfLines={1}>
                  {Math.round(item.value)}
                </Text>
                <Text style={styles.chartLabel}>{item.label}</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.chartEmpty}>
            <Text style={styles.chartEmptyTitle}>No revenue data yet</Text>
            <Text style={styles.chartEmptyText}>Once orders start coming in, the monthly trend will appear here.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MiniSparkline({ data = [] }) {
  const source = Array.isArray(data) ? data : [];
  const values = source.map((item) => Number(item?.sales || 0));
  const series = values.length ? values : [0, 0, 0, 0, 0, 0];
  const max = series.reduce((highest, value) => Math.max(highest, value), 1);

  return (
    <View style={styles.sparklineBars}>
      {series.map((value, index) => {
        const heightPx = Math.max((value / max) * 28, value > 0 ? 18 : 6);
        return (
          <View key={`${index}-${value}`} style={styles.sparklineBar}>
            <View style={styles.sparklineTrack}>
              <View style={[styles.sparklineFill, { height: heightPx }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function DashboardScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: analytics }, { data: ordersResult }, { data: notificationsResult }, { data: returnsResult }] =
        await Promise.all([
          analyticsService.getDashboardAnalytics(),
          orderService.getAllOrders({ limit: 20 }),
          notificationService.getNotifications(),
          analyticsService.getReturnsAndComplaintsReport(),
        ]);

      setData(analytics);
      setOrders(ordersResult.data || []);
      setNotifications(notificationsResult.notifications || notificationsResult.data || []);
      setReport(returnsResult);
    } catch (error) {
      Alert.alert('Unable to load dashboard', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = data?.summary || {};
  const monthlySales = data?.monthlySales || [];
  const topProducts = data?.topProducts || [];
  const lowStockItems = data?.lowStockItems || [];
  const serviceSummary = report?.summary || {};
  const currentMonthEntry = monthlySales[monthlySales.length - 1] || {};
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter((order) => new Date(order.createdAt) >= startOfToday);
  const todaysRevenue = todaysOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const sparklineSource = monthlySales.slice(-6);

  const quickStats = [
    { label: 'Revenue', value: currency(summary.totalRevenue), hint: 'All paid orders', icon: 'cash-multiple', gradientColors: ['#13263f', '#162b46'] },
    { label: 'Orders', value: summary.totalOrders || 0, hint: 'Total orders placed', icon: 'receipt-text-outline', gradientColors: ['#12253d', '#17314e'] },
    { label: 'Returns', value: summary.totalReturns || 0, hint: 'Open and completed returns', icon: 'backup-restore', gradientColors: ['#231b34', '#352246'] },
    { label: 'Low stock', value: summary.lowStockCount || 0, hint: 'Needs inventory attention', icon: 'cube-outline', gradientColors: ['#2a1f1a', '#403026'] },
  ];

  const operationalMetrics = [
    { label: 'Refunded', value: currency(serviceSummary.totalRefunded || 0), tone: 'info' },
    { label: 'Complaints', value: serviceSummary.totalComplaints || 0, tone: 'warning' },
    { label: 'Approval rate', value: `${serviceSummary.approvalRate || 0}%`, tone: 'success' },
    { label: 'Current month', value: currency(currentMonthEntry.sales || 0), tone: 'accent' },
  ];

  const activityFeed = useMemo(() => {
    const orderItems = orders.slice(0, 4).map((order) => ({
      id: `order-${order._id}`,
      title: `Order #${String(order._id).slice(-6).toUpperCase()}`,
      message: `${order.user?.name || 'Customer'} placed ${currency(order.total)} order`,
      meta: relativeTime(order.createdAt),
      tone: 'info',
      icon: 'clipboard-text-outline',
    }));

    const notificationItems = notifications.slice(0, 4).map((item) => ({
      id: `note-${item._id}`,
      title: item.title,
      message: item.message,
      meta: relativeTime(item.createdAt),
      tone: item.isRead ? 'success' : 'warning',
      icon: item.isRead ? 'check-circle-outline' : 'bell-outline',
    }));

    return [...orderItems, ...notificationItems].slice(0, 6);
  }, [orders, notifications]);

  if (loading) {
    return <Loader label="Loading admin dashboard" />;
  }

  return (
    <Screen scroll>
      <SectionHeader title="Dashboard" subtitle="At-a-glance operational health for the store." />
      <AppCard style={styles.dashboardIntro}>
        <View style={styles.dashboardIntroTop}>
          <View style={{ flex: 1 }}>
            <AppBadge label="Live overview" tone="success" />
            <Text style={styles.dashboardIntroTitle}>Today at a glance</Text>
            <Text style={styles.dashboardIntroBody}>
              A compact view of sales, orders, and alerts to help the team spot changes fast.
            </Text>
          </View>
          <View style={styles.sparklineWrap}>
            <MiniSparkline data={sparklineSource} />
            <Text style={styles.sparklineLegend}>Revenue trend</Text>
          </View>
        </View>
        <View style={styles.performanceStrip}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Today revenue</Text>
            <Text style={styles.performanceValue}>{currency(todaysRevenue)}</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Today orders</Text>
            <Text style={styles.performanceValue}>{todaysOrders.length}</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Unread alerts</Text>
            <Text style={styles.performanceValue}>{unreadNotifications}</Text>
          </View>
        </View>
      </AppCard>

      <AppCard style={[styles.dashboardIntro, styles.notificationSummaryCard]}>
        <View style={styles.notificationSummaryHeader}>
          <View>
            <Text style={styles.chartTitle}>Notifications</Text>
            <Text style={styles.notificationSummaryMeta}>
              {unreadNotifications} unread of {notifications.length} total alerts
            </Text>
          </View>
          <AppBadge label={unreadNotifications ? 'Attention' : 'All clear'} tone={unreadNotifications ? 'warning' : 'success'} />
        </View>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {notifications.slice(0, 3).map((item) => (
            <View key={item._id} style={styles.notificationItem}>
              <View style={[styles.notificationDot, !item.isRead && styles.notificationDotActive]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notificationLabel} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.notificationDescription} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>
              <Text style={styles.notificationTime}>{relativeTime(item.createdAt)}</Text>
            </View>
          ))}
          {!notifications.length ? <EmptyState title="No notifications yet" description="System alerts will show up here." /> : null}
        </View>
      </AppCard>

      <View style={styles.grid}>
        {quickStats.map((stat) => (
          <View key={stat.label} style={styles.statWrap}>
            <StatCard label={stat.label} value={stat.value} hint={stat.hint} icon={stat.icon} gradientColors={stat.gradientColors} />
          </View>
        ))}
      </View>

      <View style={styles.sectionGap}>
        <MiniBarChart data={monthlySales} />
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Quick Actions" subtitle="Fast access to the most common admin tasks." />
        <View style={styles.quickActionGrid}>
          {ADMIN_QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.screen}
              onPress={() => navigation.navigate(action.screen)}
              style={({ pressed }) => [styles.quickActionCard, pressed && styles.quickActionPressed]}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name={action.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionTitle}>{action.label}</Text>
              <Text style={styles.quickActionText}>{action.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Recent Orders" subtitle="Newest orders that need your attention." />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {orders.map((order) => (
            <AppCard key={order._id} style={styles.dashboardCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>#{String(order._id).slice(-6).toUpperCase()}</Text>
                <AppBadge label={titleCase(order.status)} tone="info" />
              </View>
              <Text style={styles.lineMeta}>{order.user?.name || 'Unknown customer'}</Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricPill}>{currency(order.total)}</Text>
                <Text style={styles.lineMeta}>{relativeTime(order.createdAt)}</Text>
              </View>
            </AppCard>
          ))}
          {!orders.length ? <EmptyState title="No recent orders" description="New orders will appear here." /> : null}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Recent Activity" subtitle="A combined feed of notifications and order updates." />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {activityFeed.map((item) => (
            <AppCard key={item.id} style={styles.activityCard}>
              <View style={styles.activityIcon}>
                <MaterialCommunityIcons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.summaryRow}>
                  <Text style={styles.lineTitle}>{item.title}</Text>
                  <AppBadge label={item.tone === 'warning' ? 'New' : 'Read'} tone={item.tone} />
                </View>
                <Text style={styles.lineMeta}>{item.message}</Text>
                <Text style={styles.activityTime}>{item.meta}</Text>
              </View>
            </AppCard>
          ))}
          {!activityFeed.length ? <EmptyState title="No activity yet" description="Orders and notifications will appear here." /> : null}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Top Products" subtitle="Best-performing items in recent orders." />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {topProducts.map((product) => (
            <AppCard key={product._id || product.productName} style={styles.dashboardCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{product.productName || product._id}</Text>
                <Text style={styles.summaryValue}>{currency(product.revenue || 0)}</Text>
              </View>
              <Text style={styles.lineMeta}>Units sold: {product.unitsSold || 0}</Text>
            </AppCard>
          ))}
          {!topProducts.length ? <EmptyState title="No top products yet" description="Orders will populate the chart data." /> : null}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Low Stock Items" subtitle="Products that need attention." />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {lowStockItems.map((item) => (
            <AppCard key={item._id} style={styles.dashboardCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{item.product?.name || 'Unknown product'}</Text>
                <AppBadge label="Low stock" tone="warning" />
              </View>
              <Text style={styles.lineMeta}>Current stock: {item.stock}</Text>
            </AppCard>
          ))}
          {!lowStockItems.length ? <EmptyState title="No low stock items" description="Inventory is healthy right now." /> : null}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Key Metrics" subtitle="A quick operational summary for the day." />
        <View style={styles.metricGrid}>
          {operationalMetrics.map((metric) => (
            <AppCard key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <AppBadge label="Summary" tone={metric.tone} style={styles.metricBadge} />
            </AppCard>
          ))}
        </View>
      </View>
    </Screen>
  );
}

export function AnalyticsScreen() {
  return <DashboardScreen />;
}

export function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    phone: '',
    address: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await userService.getUsers();
      setUsers(data.data || []);
    } catch (error) {
      Alert.alert('Unable to load users', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setSelectedId('');
    setForm({ name: '', email: '', password: '', role: 'customer', phone: '', address: '' });
  };

  const editUser = (user) => {
    setSelectedId(user._id);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'customer',
      phone: user.phone || '',
      address: user.address || '',
    });
  };

  const submit = async () => {
    try {
      setSaving(true);
      if (selectedId) {
        await userService.updateUserProfile(selectedId, form);
        await userService.updateUserRole(selectedId, { role: form.role });
      } else {
        await userService.createUser(form);
      }
      resetForm();
      await load();
      Alert.alert('Success', selectedId ? 'User updated.' : 'User created.');
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id) => {
    try {
      await userService.deleteUser(id);
      await load();
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Please try again.');
    }
  };

  if (loading) return <Loader label="Loading users" />;

  return (
    <Screen scroll>
      <SectionHeader title="Users" subtitle="Manage customer, staff, and admin accounts." />
      <AppCard>
        <AppText variant="subtitle" style={styles.cardHeading}>
          {selectedId ? 'Edit User' : 'Create User'}
        </AppText>
        <AppInput label="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <AppInput label="Email" value={form.email} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} style={{ marginTop: spacing.md }} />
        <AppInput label="Password" value={form.password} onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))} secureTextEntry style={{ marginTop: spacing.md }} />
        <AppPicker
          label="Role"
          value={form.role}
          onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
          items={[
            { label: 'Customer', value: 'customer' },
            { label: 'Staff', value: 'staff' },
            { label: 'Admin', value: 'admin' },
          ]}
          style={{ marginTop: spacing.md }}
        />
        <AppInput label="Phone" value={form.phone} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} style={{ marginTop: spacing.md }} />
        <AppInput label="Address" value={form.address} onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))} style={{ marginTop: spacing.md }} />
        <View style={styles.actionGrid}>
          <AppButton title="Reset" variant="ghost" onPress={resetForm} />
          <AppButton title={saving ? 'Saving...' : selectedId ? 'Update User' : 'Create User'} onPress={submit} loading={saving} />
        </View>
      </AppCard>

      <View style={styles.sectionGap}>
        <View style={{ gap: spacing.md }}>
          {users.map((user) => (
            <AppCard key={user._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{user.name}</Text>
                <AppBadge label={titleCase(user.role)} tone="info" />
              </View>
              <Text style={styles.lineMeta}>{user.email}</Text>
              <Text style={styles.lineMeta}>{user.phone || 'No phone'}</Text>
              <View style={styles.actionGrid}>
                <AppButton title="Edit" variant="ghost" onPress={() => editUser(user)} />
                <AppButton title="Delete" variant="ghost" onPress={() => removeUser(user._id)} />
              </View>
            </AppCard>
          ))}
          {!users.length ? <EmptyState title="No users" description="Created users will appear here." /> : null}
        </View>
      </View>
    </Screen>
  );
}

export function ProductsAdminScreen() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [imageConfirmVisible, setImageConfirmVisible] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: 'custom-tshirt',
    colors: '',
    sizes: '[]',
    tags: '',
    stock: '0',
    lowStockThreshold: '10',
    isActive: 'true',
    customArtworkAllowed: 'true',
  });

  const load = async () => {
    try {
      setLoading(true);
      const [productsResult, inventoryResult] = await Promise.all([
        productService.getProducts({ active: 'false', limit: 50 }),
        inventoryService.getInventory(),
      ]);

      const inventoryRows = inventoryResult.data.data || inventoryResult.data.inventory || [];
      const inventoryMap = new Map(
        inventoryRows.map((item) => [String(item.product?._id || item.product), item])
      );

      const mergedProducts = (productsResult.data.data || []).map((product) => ({
        ...product,
        inventory: inventoryMap.get(String(product._id)) || null,
      }));

      setProducts(mergedProducts);
    } catch (error) {
      Alert.alert('Unable to load products', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setSelectedId('');
    setImage(null);
    setPendingImage(null);
    setImageConfirmVisible(false);
    setForm({
      name: '',
      description: '',
      basePrice: '',
      category: 'custom-tshirt',
      colors: '',
      sizes: '[]',
      tags: '',
      stock: '0',
      lowStockThreshold: '10',
      isActive: 'true',
      customArtworkAllowed: 'true',
    });
  };

  const editProduct = (product) => {
    setSelectedId(product._id);
    setImage(null);
    setPendingImage(null);
    setImageConfirmVisible(false);
    setForm({
      name: product.name || '',
      description: product.description || '',
      basePrice: String(product.basePrice || ''),
      category: product.category || 'custom-tshirt',
      colors: (product.colors || []).join(', '),
      sizes: JSON.stringify(product.sizes || []),
      tags: (product.tags || []).join(', '),
      stock: String(product.inventory?.stock ?? 0),
      lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 10),
      isActive: String(product.isActive !== false),
      customArtworkAllowed: String(product.customArtworkAllowed !== false),
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    setPendingImage(result.assets[0]);
    setImageConfirmVisible(true);
  };

  const confirmSelectedImage = () => {
    if (!pendingImage) return;
    setImage(pendingImage);
    setPendingImage(null);
    setImageConfirmVisible(false);
  };

  const retakeSelectedImage = () => {
    setPendingImage(null);
    setImageConfirmVisible(false);
  };

  const submit = async () => {
    try {
      setSaving(true);
      const body = new FormData();
      body.append('name', form.name);
      body.append('description', form.description);
      body.append('basePrice', form.basePrice);
      body.append('category', form.category);
      body.append('colors', JSON.stringify(form.colors.split(',').map((value) => value.trim()).filter(Boolean)));
      body.append('sizes', form.sizes);
      body.append('tags', JSON.stringify(form.tags.split(',').map((value) => value.trim()).filter(Boolean)));
      body.append('stock', form.stock);
      body.append('lowStockThreshold', form.lowStockThreshold);
      body.append('isActive', form.isActive);
      body.append('customArtworkAllowed', form.customArtworkAllowed);
      if (image) body.append('image', imageToFormFile(image, image.fileName || 'product.jpg'));

      if (selectedId) {
        await productService.updateProduct(selectedId, body);
      } else {
        await productService.createProduct(body);
      }

      resetForm();
      await load();
      Alert.alert('Success', selectedId ? 'Product updated.' : 'Product created.');
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id) => {
    try {
      await productService.deleteProduct(id);
      await load();
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Please try again.');
    }
  };

  if (loading) return <Loader label="Loading products" />;

  return (
    <Screen scroll>
      <SectionHeader title="Products" subtitle="Create and manage catalog items on mobile." />
      <AppCard>
        <AppText variant="subtitle" style={styles.cardHeading}>
          {selectedId ? 'Edit Product' : 'New Product'}
        </AppText>
        <AppInput label="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <AppInput label="Description" value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} multiline style={{ marginTop: spacing.md }} />
        <AppInput label="Base price" value={form.basePrice} onChangeText={(value) => setForm((prev) => ({ ...prev, basePrice: value }))} keyboardType="numeric" style={{ marginTop: spacing.md }} />
        <AppInput label="Category" value={form.category} onChangeText={(value) => setForm((prev) => ({ ...prev, category: value }))} style={{ marginTop: spacing.md }} />
        <AppInput label="Colors (comma separated)" value={form.colors} onChangeText={(value) => setForm((prev) => ({ ...prev, colors: value }))} style={{ marginTop: spacing.md }} />
        <AppInput label="Sizes (JSON)" value={form.sizes} onChangeText={(value) => setForm((prev) => ({ ...prev, sizes: value }))} style={{ marginTop: spacing.md }} />
        <AppInput label="Tags (comma separated)" value={form.tags} onChangeText={(value) => setForm((prev) => ({ ...prev, tags: value }))} style={{ marginTop: spacing.md }} />
        <View style={styles.formRow}>
          <AppInput label="Stock" value={form.stock} onChangeText={(value) => setForm((prev) => ({ ...prev, stock: value }))} keyboardType="numeric" style={{ flex: 1 }} />
          <AppInput label="Low stock" value={form.lowStockThreshold} onChangeText={(value) => setForm((prev) => ({ ...prev, lowStockThreshold: value }))} keyboardType="numeric" style={{ flex: 1 }} />
        </View>
        <View style={styles.formRow}>
          <AppPicker
            label="Active"
            value={form.isActive}
            onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
            items={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
            style={{ flex: 1 }}
          />
          <AppPicker
            label="Custom art"
            value={form.customArtworkAllowed}
            onValueChange={(value) => setForm((prev) => ({ ...prev, customArtworkAllowed: value }))}
            items={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.actionGrid}>
          <AppButton title="Pick Image" variant="ghost" onPress={pickImage} />
          <AppButton title={saving ? 'Saving...' : selectedId ? 'Update Product' : 'Create Product'} onPress={submit} loading={saving} />
        </View>
        {image ? (
          <View style={styles.selectedImageWrap}>
            <Image source={{ uri: image.uri }} style={styles.selectedImagePreview} />
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedImageTitle}>Selected image ready</Text>
              <Text style={styles.selectedImageMeta}>{image.fileName || image.uri}</Text>
            </View>
            <AppButton title="Change" variant="ghost" onPress={pickImage} />
          </View>
        ) : null}
      </AppCard>

      <View style={styles.sectionGap}>
        <View style={{ gap: spacing.md }}>
          {products.map((product) => (
            <AppCard key={product._id}>
              <View style={styles.productRow}>
                <Image source={{ uri: resolveProductImageUrl(product.imageUrl) || 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?q=80&w=1200&auto=format&fit=crop' }} style={styles.productThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{product.name}</Text>
                  <Text style={styles.lineMeta}>{currency(product.basePrice)}</Text>
                  <Text style={styles.lineMeta}>Stock: {product.inventory?.stock ?? 0}</Text>
                  <Text style={styles.lineMeta}>{(product.colors || []).length} colors • {(product.sizes || []).length} sizes</Text>
                </View>
              </View>
              <View style={styles.actionGrid}>
                <AppButton title="Edit" variant="ghost" onPress={() => editProduct(product)} />
                <AppButton title="Delete" variant="ghost" onPress={() => removeProduct(product._id)} />
              </View>
            </AppCard>
          ))}
          {!products.length ? <EmptyState title="No products" description="Created products will appear here." /> : null}
        </View>
      </View>

      <Modal visible={imageConfirmVisible} transparent animationType="fade" onRequestClose={retakeSelectedImage}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Use this image?</Text>
            <Text style={styles.modalText}>
              Review the selected photo and tap Continue to attach it to the product form.
            </Text>
            {pendingImage ? <Image source={{ uri: pendingImage.uri }} style={styles.modalPreview} /> : null}
            <View style={styles.modalActions}>
              <AppButton title="Retake" variant="ghost" onPress={retakeSelectedImage} />
              <AppButton title="Continue" onPress={confirmSelectedImage} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export function InventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await inventoryService.getInventory();
      setInventory(data.data || data.inventory || []);
    } catch (error) {
      Alert.alert('Unable to load inventory', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const adjust = async (productId, changeBy) => {
    try {
      setSaving(true);
      await inventoryService.adjustStock({ productId, changeBy });
      await load();
    } catch (error) {
      Alert.alert('Adjustment failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading inventory" />;

  return (
    <Screen scroll>
      <SectionHeader title="Inventory" subtitle="Track stock and low-stock thresholds." />
      <View style={{ gap: spacing.md }}>
        {inventory.map((item) => (
          <AppCard key={item._id}>
            <View style={styles.summaryRow}>
              <Text style={styles.lineTitle}>{item.product?.name || 'Unknown product'}</Text>
              <AppBadge label={item.stock <= item.lowStockThreshold ? 'Low stock' : 'Healthy'} tone={item.stock <= item.lowStockThreshold ? 'warning' : 'success'} />
            </View>
            <Text style={styles.lineMeta}>Stock: {item.stock} / Threshold: {item.lowStockThreshold}</Text>
            <View style={styles.actionGrid}>
              <AppButton title="-1" variant="ghost" onPress={() => adjust(item.product?._id, -1)} loading={saving} />
              <AppButton title="+1" variant="ghost" onPress={() => adjust(item.product?._id, 1)} loading={saving} />
            </View>
          </AppCard>
        ))}
        {!inventory.length ? <EmptyState title="No inventory records" description="Stock rows will appear here." /> : null}
      </View>
    </Screen>
  );
}

export function OrdersAdminScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await orderService.getAllOrders({ limit: 50 });
      setOrders(data.data || []);
    } catch (error) {
      Alert.alert('Unable to load orders', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      await orderService.updateOrderStatus(orderId, { status });
      await load();
    } catch (error) {
      Alert.alert('Update failed', error?.message || 'Please try again.');
    }
  };

  if (loading) return <Loader label="Loading orders" />;

  return (
    <Screen scroll>
      <SectionHeader title="Orders" subtitle="Monitor and update order progress." />
      <View style={{ gap: spacing.md }}>
        {orders.map((order) => (
          <AppCard key={order._id}>
            <View style={styles.summaryRow}>
              <Text style={styles.lineTitle}>#{String(order._id).slice(-6).toUpperCase()}</Text>
              <AppBadge label={titleCase(order.status)} tone="info" />
            </View>
            <Text style={styles.lineMeta}>{order.user?.name || 'Unknown customer'}</Text>
            <Text style={styles.lineMeta}>{currency(order.total)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineActions}>
              {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <AppButton key={status} title={titleCase(status)} variant="ghost" onPress={() => updateStatus(order._id, status)} />
              ))}
            </ScrollView>
          </AppCard>
        ))}
        {!orders.length ? <EmptyState title="No orders" description="All order activity will appear here." /> : null}
      </View>
    </Screen>
  );
}

export function ReturnsComplaintsScreen() {
  const [returns, setReturns] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [returnsResult, complaintsResult] = await Promise.all([returnService.getAllReturns(), complaintService.getAllComplaints()]);
      setReturns(returnsResult.data.data || []);
      setComplaints(complaintsResult.data.data || []);
    } catch (error) {
      Alert.alert('Unable to load requests', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateReturn = async (id, status) => {
    try {
      await returnService.updateReturn(id, { status, adminResponse: responseText });
      setResponseText('');
      await load();
    } catch (error) {
      Alert.alert('Return update failed', error?.message || 'Please try again.');
    }
  };

  const updateComplaint = async (id, status) => {
    try {
      await complaintService.updateComplaint(id, { status, adminResponse: responseText });
      setResponseText('');
      await load();
    } catch (error) {
      Alert.alert('Complaint update failed', error?.message || 'Please try again.');
    }
  };

  if (loading) return <Loader label="Loading requests" />;

  return (
    <Screen scroll>
      <SectionHeader title="Returns & Complaints" subtitle="Handle refunds, replies, and statuses." />
      <AppCard>
        <AppInput label="Admin response" value={responseText} onChangeText={setResponseText} multiline />
      </AppCard>

      <View style={styles.sectionGap}>
        <SectionHeader title="Return Requests" />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {returns.map((request) => (
            <AppCard key={request._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{request.reasonType}</Text>
                <AppBadge label={titleCase(request.status)} tone="warning" />
              </View>
              <Text style={styles.lineMeta}>{request.reason || 'No reason provided'}</Text>
              <View style={styles.actionGrid}>
                <AppButton title="Approve" variant="ghost" onPress={() => updateReturn(request._id, 'approved')} />
                <AppButton title="Refund" variant="ghost" onPress={() => updateReturn(request._id, 'refunded')} />
                <AppButton title="Reject" variant="ghost" onPress={() => updateReturn(request._id, 'rejected')} />
              </View>
            </AppCard>
          ))}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Complaints" />
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {complaints.map((complaint) => (
            <AppCard key={complaint._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{complaint.subject}</Text>
                <AppBadge label={titleCase(complaint.status)} tone="info" />
              </View>
              <Text style={styles.lineMeta}>{complaint.message}</Text>
              <View style={styles.actionGrid}>
                <AppButton title="In progress" variant="ghost" onPress={() => updateComplaint(complaint._id, 'in_progress')} />
                <AppButton title="Resolve" variant="ghost" onPress={() => updateComplaint(complaint._id, 'resolved')} />
                <AppButton title="Close" variant="ghost" onPress={() => updateComplaint(complaint._id, 'closed')} />
              </View>
            </AppCard>
          ))}
        </View>
      </View>
    </Screen>
  );
}

export function GiftCardsScreen() {
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    initial_balance: '',
    expiry_date: '',
    status: 'active',
    quantity: '1',
  });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await giftCardService.getGiftCards();
      setGiftCards(data.data || []);
    } catch (error) {
      Alert.alert('Unable to load gift cards', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      setSaving(true);
      await giftCardService.createGiftCards({
        initial_balance: Number(form.initial_balance),
        expiry_date: form.expiry_date || undefined,
        status: form.status,
        quantity: Number(form.quantity || 1),
      });
      setForm({ initial_balance: '', expiry_date: '', status: 'active', quantity: '1' });
      await load();
      Alert.alert('Created', 'Gift card batch created.');
    } catch (error) {
      Alert.alert('Create failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await giftCardService.updateGiftCardStatus(id, { status });
      await load();
    } catch (error) {
      Alert.alert('Status update failed', error?.message || 'Please try again.');
    }
  };

  const remove = async (id) => {
    try {
      await giftCardService.deleteGiftCard(id);
      await load();
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Please try again.');
    }
  };

  if (loading) return <Loader label="Loading gift cards" />;

  return (
    <Screen scroll>
      <SectionHeader title="Gift Cards" subtitle="Create and manage reusable store credit." />
      <AppCard>
        <AppText variant="subtitle" style={styles.cardHeading}>
          New Gift Card Batch
        </AppText>
        <AppInput label="Initial balance" value={form.initial_balance} onChangeText={(value) => setForm((prev) => ({ ...prev, initial_balance: value }))} keyboardType="numeric" />
        <AppInput label="Expiry date" value={form.expiry_date} onChangeText={(value) => setForm((prev) => ({ ...prev, expiry_date: value }))} style={{ marginTop: spacing.md }} placeholder="YYYY-MM-DD" />
        <AppInput label="Quantity" value={form.quantity} onChangeText={(value) => setForm((prev) => ({ ...prev, quantity: value }))} keyboardType="numeric" style={{ marginTop: spacing.md }} />
        <AppButton title={saving ? 'Creating...' : 'Create Gift Cards'} onPress={submit} loading={saving} style={{ marginTop: spacing.md }} />
      </AppCard>
      <View style={styles.sectionGap}>
        <View style={{ gap: spacing.md }}>
          {giftCards.map((giftCard) => (
            <AppCard key={giftCard._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{giftCard.code}</Text>
                <AppBadge label={titleCase(giftCard.status)} tone="success" />
              </View>
              <Text style={styles.lineMeta}>Balance: {currency(giftCard.current_balance)}</Text>
              <View style={styles.actionGrid}>
                <AppButton title="Active" variant="ghost" onPress={() => updateStatus(giftCard._id, 'active')} />
                <AppButton title="Blocked" variant="ghost" onPress={() => updateStatus(giftCard._id, 'blocked')} />
                <AppButton title="Delete" variant="ghost" onPress={() => remove(giftCard._id)} />
              </View>
            </AppCard>
          ))}
          {!giftCards.length ? <EmptyState title="No gift cards" description="Created cards will appear here." /> : null}
        </View>
      </View>
    </Screen>
  );
}

export function PromosScreen() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastText, setBroadcastText] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    description: '',
    minOrderValue: '',
    isActive: 'true',
  });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await promoService.getPromos();
      setPromos(data.data || []);
    } catch (error) {
      Alert.alert('Unable to load promos', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      setSaving(true);
      await promoService.createPromo({
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        description: form.description,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        isActive: form.isActive === 'true',
      });
      setForm({ code: '', discountType: 'percent', discountValue: '', description: '', minOrderValue: '', isActive: 'true' });
      await load();
    } catch (error) {
      Alert.alert('Create failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePromo = async (id, isActive) => {
    try {
      await promoService.updatePromo(id, { isActive: !isActive });
      await load();
    } catch (error) {
      Alert.alert('Update failed', error?.message || 'Please try again.');
    }
  };

  const removePromo = async (id) => {
    try {
      await promoService.deletePromo(id);
      await load();
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Please try again.');
    }
  };

  const broadcast = async () => {
    if (!broadcastText.trim()) {
      Alert.alert('Broadcast text needed', 'Type a message first.');
      return;
    }

    try {
      await promoService.broadcast({ message: broadcastText.trim() });
      setBroadcastText('');
      Alert.alert('Broadcast sent', 'Promotional alert delivered.');
    } catch (error) {
      Alert.alert('Broadcast failed', error?.message || 'Please try again.');
    }
  };

  if (loading) return <Loader label="Loading promos" />;

  return (
    <Screen scroll>
      <SectionHeader title="Promos" subtitle="Manage discount campaigns and broadcasts." />
      <AppCard>
        <AppText variant="subtitle" style={styles.cardHeading}>
          New Promo
        </AppText>
        <AppInput label="Code" value={form.code} onChangeText={(value) => setForm((prev) => ({ ...prev, code: value }))} />
        <AppPicker
          label="Discount type"
          value={form.discountType}
          onValueChange={(value) => setForm((prev) => ({ ...prev, discountType: value }))}
          items={[{ label: 'Percent', value: 'percent' }, { label: 'Fixed', value: 'fixed' }]}
          style={{ marginTop: spacing.md }}
        />
        <AppInput label="Discount value" value={form.discountValue} onChangeText={(value) => setForm((prev) => ({ ...prev, discountValue: value }))} keyboardType="numeric" style={{ marginTop: spacing.md }} />
        <AppInput label="Description" value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} multiline style={{ marginTop: spacing.md }} />
        <AppInput label="Min order value" value={form.minOrderValue} onChangeText={(value) => setForm((prev) => ({ ...prev, minOrderValue: value }))} keyboardType="numeric" style={{ marginTop: spacing.md }} />
        <AppButton title={saving ? 'Saving...' : 'Create Promo'} onPress={submit} loading={saving} style={{ marginTop: spacing.md }} />
      </AppCard>

      <AppCard style={{ marginTop: spacing.lg }}>
        <AppText variant="subtitle" style={styles.cardHeading}>
          Broadcast Promotion
        </AppText>
        <AppInput label="Message" value={broadcastText} onChangeText={setBroadcastText} multiline />
        <AppButton title="Send Broadcast" onPress={broadcast} style={{ marginTop: spacing.md }} />
      </AppCard>

      <View style={styles.sectionGap}>
        <View style={{ gap: spacing.md }}>
          {promos.map((promo) => (
            <AppCard key={promo._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{promo.code}</Text>
                <AppBadge label={titleCase(promo.discountType)} tone="info" />
              </View>
              <Text style={styles.lineMeta}>{promo.description || 'No description'}</Text>
              <View style={styles.actionGrid}>
                <AppButton title={promo.isActive ? 'Disable' : 'Enable'} variant="ghost" onPress={() => togglePromo(promo._id, promo.isActive)} />
                <AppButton title="Delete" variant="ghost" onPress={() => removePromo(promo._id)} />
              </View>
            </AppCard>
          ))}
          {!promos.length ? <EmptyState title="No promos" description="Created promotions will appear here." /> : null}
        </View>
      </View>
    </Screen>
  );
}

export function ReportsScreen() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: dashboard }, { data: returns }] = await Promise.all([
        analyticsService.getDashboardAnalytics(),
        analyticsService.getReturnsAndComplaintsReport(),
      ]);
      setAnalytics({ dashboard, returns });
    } catch (error) {
      Alert.alert('Unable to load reports', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader label="Loading reports" />;

  return (
    <Screen scroll>
      <SectionHeader title="Reports" subtitle="Summary views for sales, stock, and service issues." />
      <View style={styles.grid}>
        <StatCard label="Revenue" value={currency(analytics?.dashboard?.summary?.totalRevenue)} icon="₨" />
        <StatCard label="Refunded" value={currency(analytics?.returns?.summary?.totalRefunded)} icon="↩" gradientColors={['#2a1f34', '#3d2752']} />
        <StatCard label="Complaints" value={analytics?.returns?.summary?.totalComplaints || 0} icon="✉" gradientColors={['#1f3030', '#274244']} />
        <StatCard label="Approval rate" value={`${analytics?.returns?.summary?.approvalRate || 0}%`} icon="✓" gradientColors={['#173023', '#204b34']} />
      </View>
      <AppCard style={{ marginTop: spacing.lg }}>
        <AppText variant="subtitle" style={styles.cardHeading}>
          PDF Reports
        </AppText>
        <AppText tone="muted">
          The backend still generates downloadable PDFs for sales, stock, and returns. The mobile app keeps the reporting data visible here, and the same endpoints remain available for direct download or sharing.
        </AppText>
      </AppCard>
    </Screen>
  );
}

export function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await notificationService.getNotifications();
        if (!active) return;
        setNotifications(data.notifications || data.data || []);
      } catch (error) {
        Alert.alert('Unable to load notifications', error?.message || 'Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loader label="Loading notifications" />;
  return (
    <Screen scroll>
      <SectionHeader title="Notifications" subtitle="Admin alerts and operational updates." />
      <View style={{ gap: spacing.md }}>
        {notifications.map((notification) => (
          <AppCard key={notification._id}>
            <View style={styles.summaryRow}>
              <Text style={styles.lineTitle}>{notification.title}</Text>
              <AppBadge label={notification.isRead ? 'Read' : 'New'} tone={notification.isRead ? 'success' : 'warning'} />
            </View>
            <Text style={styles.lineMeta}>{notification.message}</Text>
          </AppCard>
        ))}
        {!notifications.length ? <EmptyState title="No notifications" description="System notifications will appear here." /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statWrap: {
    width: '48%',
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
  dashboardCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  lineTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  lineMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  summaryValue: {
    color: colors.primary,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metricPill: {
    color: colors.text,
    backgroundColor: 'rgba(88, 213, 255, 0.10)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontWeight: '800',
    overflow: 'hidden',
  },
  cardHeading: {
    marginBottom: spacing.sm,
  },
  dashboardIntro: {
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  dashboardIntroTop: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  dashboardIntroTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  dashboardIntroBody: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
  },
  sparklineWrap: {
    width: 132,
    alignItems: 'center',
    gap: spacing.sm,
  },
  sparklineBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    width: '100%',
  },
  sparklineBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparklineTrack: {
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sparklineFill: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  sparklineLegend: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  performanceStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  performanceItem: {
    flex: 1,
    minWidth: '30%',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  performanceLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  performanceValue: {
    color: colors.text,
    marginTop: spacing.xs,
    fontSize: 18,
    fontWeight: '900',
  },
  notificationSummaryCard: {
    marginBottom: spacing.md,
  },
  notificationSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  notificationSummaryMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: colors.surfaceSoft,
  },
  notificationDotActive: {
    backgroundColor: colors.primary,
  },
  notificationLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  notificationDescription: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
  notificationTime: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickActionCard: {
    width: '48%',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  quickActionPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88, 213, 255, 0.10)',
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  quickActionText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  selectedImageWrap: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedImagePreview: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
  },
  selectedImageTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedImageMeta: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 11,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  productThumb: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
  },
  inlineActions: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  chartCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  chartHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  chartPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(94,227,157,0.16)',
    alignSelf: 'flex-start',
    flexShrink: 0,
    maxWidth: 120,
  },
  chartPillText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chartTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  chartSubtitle: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  chartBars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chartColumn: {
    width: '23%',
    gap: spacing.sm,
  },
  chartTrack: {
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartFill: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  chartValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chartEmpty: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  chartEmptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  chartEmptyText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88, 213, 255, 0.10)',
    marginTop: 2,
  },
  activityTime: {
    color: colors.primary,
    marginTop: spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    width: '48%',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  metricBadge: {
    alignSelf: 'flex-start',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  modalPreview: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});

