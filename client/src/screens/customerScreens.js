import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppBadge, AppButton, AppCard, AppInput, AppPicker, AppText, SectionHeader } from '../components/ui/Atoms';
import Screen from '../components/ui/Screen';
import { EmptyState, ErrorState, Loader } from '../components/ui/States';
import OrderCard from '../components/features/OrderCard';
import { authService } from '../services/authService';
import { complaintService } from '../services/complaintService';
import { notificationService } from '../services/notificationService';
import { orderService } from '../services/orderService';
import { returnService } from '../services/returnService';
import { useAuthStore } from '../store/authStore';
import { colors, radius, spacing } from '../theme';
import { currency, relativeTime, shortDate, statusColor, titleCase } from '../utils/format';
import { resolveProductImageUrl } from '../utils/image';

const imageToFormFile = (asset, name = 'upload.jpg') => ({
  uri: asset.uri,
  name,
  type: asset.mimeType || 'image/jpeg',
});

export function OrdersScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await orderService.getMyOrders({ limit: 50 });
        if (!active) return;
        setOrders(data.data || []);
      } catch (error) {
        Alert.alert('Unable to load orders', error?.message || 'Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <Loader label="Loading orders" />;
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<SectionHeader title="My Orders" subtitle="Track order progress and payments." />}
        renderItem={({ item }) => (
          <View style={{ marginBottom: spacing.md }}>
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetails', { id: item._id })}
              onPayInstallment={item.paymentMethod === 'installment' ? () => navigation.navigate('OrderDetails', { id: item._id }) : null}
            />
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No orders yet" description="Your order history will appear here." />}
      />
    </Screen>
  );
}

export function OrderDetailsScreen() {
  const route = useRoute();
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await orderService.getOrderById(route.params?.id);
      setOrder(data.order);
      setPayments(data.payments || []);
    } catch (error) {
      Alert.alert('Unable to load order', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.id]);

  const payInstallment = async () => {
    try {
      setPaying(true);
      await orderService.payInstallment(order._id);
      await load();
      Alert.alert('Installment paid', 'The payment has been recorded.');
    } catch (error) {
      Alert.alert('Payment failed', error?.message || 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <Loader label="Loading order details" />;
  }

  if (!order) {
    return <ErrorState title="Order not found" description="This order may not exist anymore." />;
  }

  return (
    <Screen scroll>
      <SectionHeader title={`Order #${String(order._id).slice(-6).toUpperCase()}`} subtitle={shortDate(order.createdAt)} />
      <View style={{ gap: spacing.md }}>
        <AppCard>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <AppBadge label={titleCase(order.status)} tone="info" />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment</Text>
            <Text style={styles.summaryValue}>{titleCase(order.paymentStatus)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{currency(order.total)}</Text>
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Items
          </AppText>
          <View style={{ gap: spacing.md }}>
            {order.items?.map((item, index) => (
              <View key={`${item.productName}-${index}`} style={styles.lineItem}>
                <Image
                  source={{ uri: resolveProductImageUrl(item.customPreviewImage || item.baseProductImage || item.product?.imageUrl || '') || 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?q=80&w=1200&auto=format&fit=crop' }}
                  style={styles.thumb}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{item.productName}</Text>
                  <Text style={styles.lineMeta}>
                    {item.size || 'N/A'} • {item.color || 'Default'} • Qty {item.quantity}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>{currency(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Delivery Address
          </AppText>
          <AppText tone="muted">
            {order.deliveryAddress.fullName}
            {'\n'}
            {order.deliveryAddress.addressLine1}
            {order.deliveryAddress.addressLine2 ? `\n${order.deliveryAddress.addressLine2}` : ''}
            {'\n'}
            {order.deliveryAddress.city}, {order.deliveryAddress.state}
            {'\n'}
            {order.deliveryAddress.country} {order.deliveryAddress.postalCode}
          </AppText>
        </AppCard>

        {order.paymentMethod === 'installment' && order.paymentStatus !== 'paid' ? (
          <AppButton title={paying ? 'Processing...' : 'Pay Installment'} onPress={payInstallment} loading={paying} />
        ) : null}

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Payments
          </AppText>
          {payments.length ? (
            <View style={{ gap: spacing.sm }}>
              {payments.map((payment) => (
                <View key={payment._id} style={styles.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineTitle}>{titleCase(payment.method)}</Text>
                    <Text style={styles.lineMeta}>{shortDate(payment.createdAt)}</Text>
                  </View>
                  <Text style={styles.lineTotal}>{currency(payment.amount)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <AppText tone="muted">No payment records yet.</AppText>
          )}
        </AppCard>
      </View>
    </Screen>
  );
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await notificationService.getNotifications();
      setNotifications(data.notifications || data.data || []);
    } catch (error) {
      Alert.alert('Unable to load notifications', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <Loader label="Loading notifications" />;
  }

  return (
    <Screen scroll>
      <SectionHeader title="Notifications" subtitle="Recent order, payment, and promo updates." />
      <View style={{ gap: spacing.md }}>
        {notifications.map((notification) => (
          <AppCard key={notification._id}>
            <View style={styles.summaryRow}>
              <Text style={styles.lineTitle}>{notification.title}</Text>
              <AppBadge label={notification.isRead ? 'Read' : 'New'} tone={notification.isRead ? 'success' : 'warning'} />
            </View>
            <Text style={styles.lineMeta}>{notification.message}</Text>
            <Text style={[styles.lineMeta, { marginTop: spacing.sm }]}>{relativeTime(notification.createdAt)}</Text>
          </AppCard>
        ))}
        {!notifications.length ? <EmptyState title="No notifications" description="System alerts will appear here." /> : null}
      </View>
    </Screen>
  );
}

export function ReturnsScreen() {
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [form, setForm] = useState({
    orderId: '',
    reasonType: 'damaged_product',
    reason: '',
    description: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const [ordersResult, returnsResult] = await Promise.all([orderService.getMyOrders({ limit: 50 }), returnService.getMyReturns()]);
      setOrders(ordersResult.data.data || []);
      setReturns(returnsResult.data.data || returnsResult.data.returns || []);
    } catch (error) {
      Alert.alert('Unable to load returns', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const orderItems = useMemo(
    () => [{ label: 'Select order', value: '' }, ...orders.map((order) => ({ label: `#${String(order._id).slice(-6).toUpperCase()} - ${titleCase(order.status)}`, value: order._id }))],
    [orders]
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) return;
    setSelectedImage(result.assets[0]);
  };

  const submit = async () => {
    if (!form.orderId) {
      Alert.alert('Order required', 'Select an order before submitting a return.');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Photo required', 'Attach a damaged product image.');
      return;
    }

    try {
      setSubmitting(true);
      const body = new FormData();
      body.append('orderId', form.orderId);
      body.append('reasonType', form.reasonType);
      if (form.reason) body.append('reason', form.reason);
      if (form.description) body.append('description', form.description);
      body.append('damagedImage', imageToFormFile(selectedImage, selectedImage.fileName || 'damaged.jpg'));
      await returnService.createReturn(body);
      setSelectedImage(null);
      setForm({ orderId: '', reasonType: 'damaged_product', reason: '', description: '' });
      await load();
      Alert.alert('Return submitted', 'Your return request has been sent.');
    } catch (error) {
      Alert.alert('Return failed', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader label="Loading return requests" />;
  }

  return (
    <Screen scroll>
      <SectionHeader title="Returns" subtitle="Submit and track return requests." />
      <View style={{ gap: spacing.md }}>
        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            New Return Request
          </AppText>
          <AppPicker label="Order" value={form.orderId} onValueChange={(value) => setForm((prev) => ({ ...prev, orderId: value }))} items={orderItems} />
          <AppPicker
            label="Reason"
            value={form.reasonType}
            onValueChange={(value) => setForm((prev) => ({ ...prev, reasonType: value }))}
            items={[
              { label: 'Damaged product', value: 'damaged_product' },
              { label: 'Wrong item', value: 'wrong_item' },
              { label: 'Not satisfied', value: 'not_satisfied' },
              { label: 'Other', value: 'other' },
            ]}
            style={{ marginTop: spacing.md }}
          />
          <AppInput label="Reason" value={form.reason} onChangeText={(value) => setForm((prev) => ({ ...prev, reason: value }))} style={{ marginTop: spacing.md }} />
          <AppInput
            label="Description"
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
            multiline
            style={{ marginTop: spacing.md }}
          />
          <View style={styles.actionGrid}>
            <AppButton title={selectedImage ? 'Photo selected' : 'Attach photo'} variant="ghost" onPress={pickImage} />
            <AppButton title={submitting ? 'Submitting...' : 'Submit Return'} onPress={submit} loading={submitting} />
          </View>
        </AppCard>

        <View style={{ gap: spacing.md }}>
          {returns.map((request) => (
            <AppCard key={request._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{request.reasonType}</Text>
                <AppBadge label={titleCase(request.status)} tone="info" />
              </View>
              <Text style={styles.lineMeta}>{shortDate(request.createdAt)}</Text>
              <Text style={styles.lineMeta}>{request.description || request.reason || 'No description'}</Text>
            </AppCard>
          ))}
          {!returns.length ? <EmptyState title="No returns yet" description="Your submitted return requests will appear here." /> : null}
        </View>
      </View>
    </Screen>
  );
}

export function ComplaintsScreen() {
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [form, setForm] = useState({
    orderId: '',
    subject: '',
    message: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const [ordersResult, complaintsResult] = await Promise.all([orderService.getMyOrders({ limit: 50 }), complaintService.getMyComplaints()]);
      setOrders(ordersResult.data.data || []);
      setComplaints(complaintsResult.data.data || complaintsResult.data.complaints || []);
    } catch (error) {
      Alert.alert('Unable to load complaints', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const orderItems = useMemo(
    () => [{ label: 'Optional', value: '' }, ...orders.map((order) => ({ label: `#${String(order._id).slice(-6).toUpperCase()} - ${titleCase(order.status)}`, value: order._id }))],
    [orders]
  );

  const pickAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) return;
    setAttachment(result.assets[0]);
  };

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      Alert.alert('Missing details', 'Add a subject and message.');
      return;
    }

    try {
      setSubmitting(true);
      const body = new FormData();
      if (form.orderId) body.append('orderId', form.orderId);
      body.append('subject', form.subject);
      body.append('message', form.message);
      if (attachment) body.append('attachment', imageToFormFile(attachment, attachment.fileName || 'complaint.jpg'));
      await complaintService.createComplaint(body);
      setAttachment(null);
      setForm({ orderId: '', subject: '', message: '' });
      await load();
      Alert.alert('Complaint submitted', 'Your complaint has been sent successfully.');
    } catch (error) {
      Alert.alert('Submission failed', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader label="Loading complaints" />;
  }

  return (
    <Screen scroll>
      <SectionHeader title="Complaints" subtitle="Submit issues and follow status updates." />
      <View style={{ gap: spacing.md }}>
        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            New Complaint
          </AppText>
          <AppPicker label="Order" value={form.orderId} onValueChange={(value) => setForm((prev) => ({ ...prev, orderId: value }))} items={orderItems} />
          <AppInput label="Subject" value={form.subject} onChangeText={(value) => setForm((prev) => ({ ...prev, subject: value }))} style={{ marginTop: spacing.md }} />
          <AppInput label="Message" value={form.message} onChangeText={(value) => setForm((prev) => ({ ...prev, message: value }))} multiline style={{ marginTop: spacing.md }} />
          <View style={styles.actionGrid}>
            <AppButton title={attachment ? 'Attachment added' : 'Add attachment'} variant="ghost" onPress={pickAttachment} />
            <AppButton title={submitting ? 'Sending...' : 'Submit Complaint'} onPress={submit} loading={submitting} />
          </View>
        </AppCard>

        <View style={{ gap: spacing.md }}>
          {complaints.map((complaint) => (
            <AppCard key={complaint._id}>
              <View style={styles.summaryRow}>
                <Text style={styles.lineTitle}>{complaint.subject}</Text>
                <AppBadge label={titleCase(complaint.status)} tone="info" />
              </View>
              <Text style={styles.lineMeta}>{shortDate(complaint.createdAt)}</Text>
              <Text style={styles.lineMeta}>{complaint.message}</Text>
            </AppCard>
          ))}
          {!complaints.length ? <EmptyState title="No complaints yet" description="Any filed complaints will appear here." /> : null}
        </View>
      </View>
    </Screen>
  );
}

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await authService.getActivity({ limit: 10 });
      setActivity(data.activityLogs || data.data || []);
    } catch (error) {
      Alert.alert('Unable to load profile activity', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.length) return;
    setAvatar(result.assets[0]);
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const body = new FormData();
      body.append('name', form.name);
      body.append('email', form.email);
      body.append('phone', form.phone);
      body.append('address', form.address);
      if (avatar) body.append('avatar', imageToFormFile(avatar, avatar.fileName || 'avatar.jpg'));
      await updateProfile(body);
      Alert.alert('Profile updated', 'Your account details were saved.');
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) {
      Alert.alert('Missing password', 'Fill in both password fields.');
      return;
    }

    try {
      setChangingPassword(true);
      await authService.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      Alert.alert('Password updated', 'Your password has been changed successfully.');
    } catch (error) {
      Alert.alert('Change failed', error?.message || 'Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const doLogout = async () => {
    await logout();
  };

  if (loading) {
    return <Loader label="Loading profile" />;
  }

  return (
    <Screen scroll>
      <SectionHeader title="Profile" subtitle="Update your mobile account and password." />
      <View style={{ gap: spacing.md }}>
        <AppCard>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{user?.name}</Text>
              <Text style={styles.lineMeta}>{user?.email}</Text>
              <AppBadge label={titleCase(user?.role || 'customer')} tone="info" style={{ marginTop: spacing.sm }} />
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Wallet balance</Text>
            <Text style={styles.summaryValue}>{currency(user?.walletBalance || 0)}</Text>
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Edit Profile
          </AppText>
          <AppInput label="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <AppInput label="Email" value={form.email} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} style={{ marginTop: spacing.md }} />
          <AppInput label="Phone" value={form.phone} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} style={{ marginTop: spacing.md }} />
          <AppInput label="Address" value={form.address} onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))} multiline style={{ marginTop: spacing.md }} />
          <View style={styles.actionGrid}>
            <AppButton title="Change Avatar" variant="ghost" onPress={pickAvatar} />
            <AppButton title={saving ? 'Saving...' : 'Save Profile'} onPress={saveProfile} loading={saving} />
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Change Password
          </AppText>
          <AppInput
            label="Current password"
            value={passwords.currentPassword}
            onChangeText={(value) => setPasswords((prev) => ({ ...prev, currentPassword: value }))}
            secureTextEntry
          />
          <AppInput
            label="New password"
            value={passwords.newPassword}
            onChangeText={(value) => setPasswords((prev) => ({ ...prev, newPassword: value }))}
            secureTextEntry
            style={{ marginTop: spacing.md }}
          />
          <AppButton
            title={changingPassword ? 'Updating...' : 'Update Password'}
            onPress={changePassword}
            loading={changingPassword}
            style={{ marginTop: spacing.md }}
          />
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Recent Activity
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {activity.map((entry, index) => (
              <View key={`${entry.createdAt}-${index}`} style={styles.activityRow}>
                <Text style={styles.lineTitle}>{entry.action}</Text>
                <Text style={styles.lineMeta}>{relativeTime(entry.createdAt)}</Text>
              </View>
            ))}
            {!activity.length ? <AppText tone="muted">No recent activity found.</AppText> : null}
          </View>
        </AppCard>

        <AppButton title="Sign Out" onPress={doLogout} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontWeight: '800',
  },
  cardHeading: {
    marginBottom: spacing.sm,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
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
  lineTotal: {
    color: colors.primary,
    fontWeight: '800',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88,213,255,0.14)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  activityRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
