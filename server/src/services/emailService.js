import nodemailer from 'nodemailer';

const getEnvValue = (...keys) =>
  keys.map((key) => process.env[key]).find((value) => value !== undefined && String(value).trim() !== '');

const getStoreName = () => process.env.REPORT_COMPANY_NAME || 'Custom Tee Studio';

const getStoreSubtitle = () =>
  process.env.REPORT_COMPANY_SUBTITLE || 'Web-Based Customized T-Shirt Printing Management System';

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const getRecordCode = (id) => String(id || '').slice(-8).toUpperCase();

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (value) =>
  `Rs ${new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))}`;

const formatDateTime = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const humanize = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatPaymentMethod = (value = '') => {
  const method = String(value || '').toLowerCase();
  const labels = {
    cod: 'Cash on Delivery',
    installment: 'Installment',
    gift_card: 'Gift Card',
  };

  return labels[method] || humanize(method);
};

const parseFromIdentity = (value = '') => {
  const input = String(value || '').trim();
  if (!input) return null;

  const namedMatch = input.match(/^(.*)<([^<>]+)>$/);
  if (namedMatch) {
    return {
      displayName: namedMatch[1].trim().replace(/^["']|["']$/g, ''),
      email: namedMatch[2].trim(),
    };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
    return {
      displayName: '',
      email: input,
    };
  }

  return {
    displayName: input,
    email: '',
  };
};

const buildFromHeader = ({ configuredFrom, authUser }) => {
  const parsed = parseFromIdentity(configuredFrom);
  const senderEmail = String(authUser || '').trim();
  const fallbackName = getStoreName();

  if (!senderEmail) {
    return configuredFrom || fallbackName;
  }

  if (!parsed) {
    return `"${fallbackName}" <${senderEmail}>`;
  }

  if (parsed.email && parsed.email !== senderEmail) {
    console.warn('[EmailService] EMAIL_FROM does not match EMAIL_USER. Using the authenticated Gmail address instead.');
  }

  const displayName = parsed.displayName || fallbackName;
  return `"${displayName}" <${senderEmail}>`;
};

const formatAddressLines = (address = {}) => {
  const lines = [
    address.fullName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state].filter(Boolean).join(', '),
    [address.country, address.postalCode].filter(Boolean).join(' '),
  ]
    .map((line) => String(line || '').trim())
    .filter(Boolean);

  return lines;
};

const renderEmailShell = ({ title, preheader, body }) => `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:#111827;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.8;">
                  ${escapeHtml(getStoreName())}
                </div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.7;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;color:#6b7280;font-size:12px;line-height:1.5;">
                ${escapeHtml(getStoreName())} · ${escapeHtml(getStoreSubtitle())}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderKeyValueRows = (rows = []) =>
  rows
    .map(
      ([label, value, emphasis = false]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:42%;">${escapeHtml(
            label
          )}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:${emphasis ? '#111827' : '#1f2937'};font-weight:${
            emphasis ? '700' : '400'
          };text-align:right;">${value}</td>
        </tr>`
    )
    .join('');

const renderItemsRows = (items = []) =>
  items
    .map((item) => {
      const itemName = escapeHtml(item.label || '');
      const quantity = escapeHtml(String(item.quantity || 0));
      const unitPrice = escapeHtml(formatCurrency(item.unitPrice || 0));
      const lineTotal = escapeHtml(formatCurrency(item.lineTotal || 0));

      return `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${itemName}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:center;">${quantity}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:right;">${unitPrice}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right;font-weight:600;">${lineTotal}</td>
        </tr>`;
    })
    .join('');

class EmailService {
  constructor() {
    this.transport = null;
    this.transportKey = '';
  }

  getTransport() {
    const host = getEnvValue('EMAIL_HOST', 'SMTP_HOST') || 'smtp.gmail.com';
    const portValue = Number(getEnvValue('EMAIL_PORT', 'SMTP_PORT') || 587);
    const port = Number.isFinite(portValue) ? portValue : 587;
    const secure = toBoolean(getEnvValue('EMAIL_SECURE', 'SMTP_SECURE'), port === 465);
    const user = getEnvValue('EMAIL_USER', 'SMTP_USER') || '';
    const pass = getEnvValue('EMAIL_PASS', 'SMTP_PASS') || '';
    const configuredFrom = getEnvValue('EMAIL_FROM', 'SMTP_FROM') || '';
    const from = buildFromHeader({
      configuredFrom,
      authUser: user,
    });

    if (!host || !user || !pass) {
      return {
        transport: null,
        from,
        configured: false,
      };
    }

    const key = `${host}|${port}|${secure}|${user}|${from}`;

    if (!this.transport || this.transportKey !== key) {
      this.transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.transportKey = key;
    }

    return {
      transport: this.transport,
      from,
      configured: true,
    };
  }

  async send({ to, subject, text = '', html = '', body = '' }) {
    const { transport, from, configured } = this.getTransport();
    const messageText = text || body || '';
    const messageHtml = html || (messageText ? `<pre style="font-family:inherit;white-space:pre-wrap;margin:0;">${escapeHtml(messageText)}</pre>` : '');

    if (!configured || !transport) {
      console.warn('[EmailService] SMTP is not configured. Email skipped.', {
        to,
        subject,
      });
      return {
        success: false,
        skipped: true,
        reason: 'smtp_not_configured',
      };
    }

    try {
      const info = await transport.sendMail({
        from,
        to,
        subject,
        text: messageText,
        html: messageHtml,
      });

      console.log('[EmailService] Email sent', {
        to,
        subject,
        messageId: info.messageId,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('[EmailService] Failed to send email', {
        to,
        subject,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  buildOrderEmail(user, order) {
    const customerName = user?.name || 'Customer';
    const orderCode = getRecordCode(order?._id);
    const placedAt = formatDateTime(order?.createdAt);
    const items = Array.isArray(order?.items) ? order.items : [];
    const addressLines = formatAddressLines(order?.deliveryAddress || {});
    const summaryRows = [
      ['Subtotal', escapeHtml(formatCurrency(order?.subtotal || 0))],
      ['Promo discount', escapeHtml(formatCurrency(order?.promoDiscount || 0))],
      ['Gift card applied', escapeHtml(formatCurrency(order?.giftCardAmount || 0))],
      ['Delivery fee', escapeHtml(formatCurrency(order?.deliveryFee || 0))],
      ['Total', escapeHtml(formatCurrency(order?.total || 0)), true],
    ];

    const normalizedItems = items.map((item) => {
      const variant = [item.size, item.color].filter(Boolean).join(' / ');
      return {
        label: variant ? `${item.productName} (${variant})` : item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.totalPrice ?? Number((Number(item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(2)),
      };
    });

    const itemsRows =
      normalizedItems.length > 0
        ? renderItemsRows(normalizedItems)
        : `<tr><td colspan="4" style="padding:16px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:center;">No items</td></tr>`;

    const text = [
      `Hello ${customerName},`,
      '',
      `Your order #${orderCode} has been received successfully.`,
      `Placed on: ${placedAt}`,
      `Payment method: ${formatPaymentMethod(order?.paymentMethod)}`,
      `Order status: ${humanize(order?.status || 'pending')}`,
      `Payment status: ${humanize(order?.paymentStatus || 'pending')}`,
      '',
      'Items:',
      ...normalizedItems.map(
        (item) =>
          `- ${item.label} x ${item.quantity} | Unit ${formatCurrency(item.unitPrice)} | Line ${formatCurrency(
            item.lineTotal
          )}`
      ),
      '',
      'Summary:',
      `- Subtotal: ${formatCurrency(order?.subtotal || 0)}`,
      `- Promo discount: ${formatCurrency(order?.promoDiscount || 0)}`,
      `- Gift card applied: ${formatCurrency(order?.giftCardAmount || 0)}`,
      `- Delivery fee: ${formatCurrency(order?.deliveryFee || 0)}`,
      `- Total: ${formatCurrency(order?.total || 0)}`,
      '',
      'Delivery address:',
      ...addressLines,
      '',
      'If you have any questions, reply to this email and our team will help you.',
    ]
      .filter(Boolean)
      .join('\n');

    const html = renderEmailShell({
      title: `Order Confirmation #${orderCode}`,
      preheader: `Your order #${orderCode} has been placed successfully.`,
      body: `
        <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(customerName)}</strong>,</p>
        <p style="margin:0 0 20px;">Your order <strong>#${escapeHtml(orderCode)}</strong> has been received successfully. We will notify you when the order moves to the next stage.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-collapse:separate;">
          ${renderKeyValueRows([
            ['Placed on', escapeHtml(placedAt)],
            ['Payment method', escapeHtml(formatPaymentMethod(order?.paymentMethod))],
            ['Order status', escapeHtml(humanize(order?.status || 'pending'))],
            ['Payment status', escapeHtml(humanize(order?.paymentStatus || 'pending'))],
          ])}
        </table>

        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Order Items</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-collapse:separate;">
          <thead>
            <tr style="background:#f9fafb;color:#6b7280;">
              <th style="padding:12px 14px;text-align:left;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Item</th>
              <th style="padding:12px 14px;text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Qty</th>
              <th style="padding:12px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Unit</th>
              <th style="padding:12px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-collapse:separate;">
          ${renderKeyValueRows(summaryRows)}
        </table>

        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Delivery Address</h2>
        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;color:#374151;line-height:1.6;">
          ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        </div>

        <p style="margin:24px 0 0;">If you need help with your order, just reply to this message.</p>
      `,
    });

    return { subject: `Order Confirmation #${orderCode}`, text, html };
  }

  buildReturnEmail(user, returnRequest, order) {
    const customerName = user?.name || 'Customer';
    const orderCode = getRecordCode(order?._id || returnRequest?.order);
    const returnCode = getRecordCode(returnRequest?._id);
    const requestedAt = formatDateTime(returnRequest?.createdAt);
    const items = Array.isArray(returnRequest?.items) ? returnRequest.items : [];
    const itemLines = items.length
      ? items.map((item) => {
          const variant = [item.size, item.color].filter(Boolean).join(' / ');
          const label = variant ? `${item.productName} (${variant})` : item.productName;
          const quantity = Number(item.quantity || 0);
          const lineTotal = Number((Number(item.unitPrice || 0) * quantity).toFixed(2));
          return {
            label,
            quantity,
            unitPrice: Number(item.unitPrice || 0),
            lineTotal,
          };
        })
      : [];

    const itemRows =
      itemLines.length > 0
        ? renderItemsRows(itemLines)
        : `<tr><td colspan="4" style="padding:16px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:center;">No items</td></tr>`;

    const text = [
      `Hello ${customerName},`,
      '',
      `We received your return request for order #${orderCode}.`,
      `Return reference: #${returnCode}`,
      `Submitted on: ${requestedAt}`,
      `Status: Pending review`,
      `Reason: ${humanize(returnRequest?.reasonType || '')}`,
      `Refund amount: ${formatCurrency(returnRequest?.refundAmount || 0)}`,
      '',
      'Items:',
      ...itemLines.map(
        (item) =>
          `- ${item.label} x ${item.quantity} | Unit ${formatCurrency(item.unitPrice)} | Line ${formatCurrency(
            item.lineTotal
          )}`
      ),
      '',
      'We will review your request and contact you if any additional information is needed.',
    ]
      .filter(Boolean)
      .join('\n');

    const html = renderEmailShell({
      title: `Return Confirmation #${returnCode}`,
      preheader: `Your return request for order #${orderCode} is pending review.`,
      body: `
        <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(customerName)}</strong>,</p>
        <p style="margin:0 0 20px;">We received your return request for order <strong>#${escapeHtml(
          orderCode
        )}</strong>. Your request is now pending review.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-collapse:separate;">
          ${renderKeyValueRows([
            ['Return reference', `#${escapeHtml(returnCode)}`],
            ['Submitted on', escapeHtml(requestedAt)],
            ['Status', 'Pending review'],
            ['Reason', escapeHtml(humanize(returnRequest?.reasonType || ''))],
            ['Refund amount', escapeHtml(formatCurrency(returnRequest?.refundAmount || 0)), true],
          ])}
        </table>

        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Requested Items</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-collapse:separate;">
          <thead>
            <tr style="background:#f9fafb;color:#6b7280;">
              <th style="padding:12px 14px;text-align:left;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Item</th>
              <th style="padding:12px 14px;text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Qty</th>
              <th style="padding:12px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Unit</th>
              <th style="padding:12px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <p style="margin:0;">We will review your request and contact you if anything else is needed.</p>
      `,
    });

    return { subject: `Return Confirmation #${returnCode}`, text, html };
  }

  async sendRegistrationEmail(user) {
    return this.send({
      to: user.email,
      subject: 'Welcome to Customized T-Shirt Printing',
      text: `Hello ${user.name}, your account has been created successfully.`,
    });
  }

  async sendLoginEmail(user) {
    return this.send({
      to: user.email,
      subject: 'New Login Alert',
      text: `Hi ${user.name}, your account was accessed on ${new Date().toUTCString()}.`,
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    return this.send({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Use this token to reset your password: ${resetToken}`,
    });
  }

  async sendOrderConfirmationEmail(user, order) {
    const { subject, text, html } = this.buildOrderEmail(user, order);
    return this.send({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  async sendReturnConfirmationEmail(user, returnRequest, order) {
    const { subject, text, html } = this.buildReturnEmail(user, returnRequest, order);
    return this.send({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  async sendPromotionalAlert(users, message) {
    const notifications = users.map((user) =>
      this.send({
        to: user.email,
        subject: 'Promotional Alert',
        text: message,
      })
    );

    await Promise.all(notifications);
  }
}

export default new EmailService();
