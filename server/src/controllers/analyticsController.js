import PDFDocument from 'pdfkit';

import Complaint from '../models/Complaint.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const REPORT_COMPANY_NAME = process.env.REPORT_COMPANY_NAME || 'Custom Tee Studio';
const REPORT_COMPANY_SUBTITLE =
  process.env.REPORT_COMPANY_SUBTITLE || 'Web-Based Customized T-Shirt Printing Management System';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const safeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toStartOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const toEndOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getDateRangeFromQuery = (query) => {
  const to = safeDate(query.to) || new Date();
  const from = safeDate(query.from) || new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  const normalizedFrom = toStartOfDay(from);
  const normalizedTo = toEndOfDay(to);

  if (normalizedFrom > normalizedTo) {
    throw new ApiError(400, 'Invalid date range. "from" must be before "to".');
  }

  return {
    from: normalizedFrom,
    to: normalizedTo,
  };
};

const formatDate = (value) => DATE_FORMATTER.format(new Date(value));
const formatDateTime = (value) => DATE_TIME_FORMATTER.format(new Date(value));

const setPdfDownloadHeaders = (res, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
};

const createReportDocument = (res, filename) => {
  setPdfDownloadHeaders(res, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true });
  doc.pipe(res);
  return doc;
};

const drawReportHeader = (doc, { title, dateRangeLabel }) => {
  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const top = doc.page.margins.top;
  const logoSize = 34;

  doc.save();
  doc.circle(left + logoSize / 2, top + logoSize / 2, logoSize / 2).fill('#111827');
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('CTS', left, top + 12, {
      width: logoSize,
      align: 'center',
    });
  doc.restore();

  const textStartX = left + logoSize + 12;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(15).text(REPORT_COMPANY_NAME, textStartX, top + 1);
  doc
    .fillColor('#64748b')
    .font('Helvetica')
    .fontSize(9)
    .text(REPORT_COMPANY_SUBTITLE, textStartX, top + 20, { width: pageWidth - logoSize - 12 });

  let y = top + logoSize + 20;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(title, left, y);
  y = doc.y + 4;

  const generatedText = `Generated: ${formatDateTime(new Date())}`;
  const rangeText = dateRangeLabel ? `Date Range: ${dateRangeLabel}` : '';

  doc
    .fillColor('#475569')
    .font('Helvetica')
    .fontSize(10)
    .text(generatedText, left, y, { width: pageWidth, align: 'left' });
  if (rangeText) {
    doc.text(rangeText, left, y, { width: pageWidth, align: 'right' });
  }

  y += 24;
  doc.moveTo(left, y).lineTo(left + pageWidth, y).lineWidth(0.7).strokeColor('#e2e8f0').stroke();
  return y + 16;
};

const addPageNumbers = (doc) => {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let index = 0; index < totalPages; index += 1) {
    doc.switchToPage(index);
    const label = `Page ${index + 1} of ${totalPages}`;

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#64748b')
      .text(label, doc.page.margins.left, doc.page.height - doc.page.margins.bottom + 10, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'right',
      });
  }

  doc.switchToPage(totalPages - 1);
};

const drawTable = (doc, { columns, rows, startY, title }) => {
  const left = doc.page.margins.left;
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headerHeight = 24;
  const rowHeight = 22;
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 30;
  const titleGap = 18;
  let y = startY;

  const drawTableHeader = () => {
    doc.rect(left, y, availableWidth, headerHeight).fill('#f1f5f9');

    let x = left;
    columns.forEach((column) => {
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(column.label, x + 6, y + 7, {
          width: column.width - 12,
          align: column.align || 'left',
        });
      x += column.width;
    });

    y += headerHeight;
  };

  const ensureSpace = (height) => {
    if (y + height <= bottomLimit) return;
    doc.addPage();
    y = doc.page.margins.top;
    drawTableHeader();
  };

  if (title) {
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(title, left, y);
    y = doc.y + 6;
  }

  drawTableHeader();

  rows.forEach((row, index) => {
    ensureSpace(rowHeight);

    if (index % 2 === 0) {
      doc.rect(left, y, availableWidth, rowHeight).fill('#ffffff');
    } else {
      doc.rect(left, y, availableWidth, rowHeight).fill('#f8fafc');
    }

    let x = left;
    columns.forEach((column) => {
      const cellValue = row[column.key] ?? '';
      doc
        .fillColor('#1e293b')
        .font('Helvetica')
        .fontSize(9.5)
        .text(String(cellValue), x + 6, y + 6, {
          width: column.width - 12,
          align: column.align || 'left',
          ellipsis: true,
        });
      x += column.width;
    });

    y += rowHeight;
  });

  doc.rect(left, y, availableWidth, 0.5).fill('#e2e8f0');
  return y + titleGap;
};

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const [totalUsers, totalOrders, totalReturns, totalComplaints, lowStockItems] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    ReturnRequest.countDocuments(),
    Complaint.countDocuments(),
    Inventory.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } }).populate('product', 'name'),
  ]);

  const revenueResult = await Order.aggregate([
    {
      $match: {
        paymentStatus: { $in: ['paid', 'partially_paid'] },
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total' },
      },
    },
  ]);

  const monthlySales = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        sales: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
      },
    },
  ]);

  const topProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.totalPrice' },
        productName: { $first: '$items.productName' },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 5 },
  ]);

  res.status(200).json({
    summary: {
      totalUsers,
      totalOrders,
      totalReturns,
      totalComplaints,
      totalRevenue: revenueResult[0]?.revenue || 0,
      lowStockCount: lowStockItems.length,
    },
    lowStockItems,
    monthlySales,
    topProducts,
  });
});

export const getMonthlySalesReport = asyncHandler(async (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear());

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const report = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        grossSales: { $sum: '$total' },
        orders: { $sum: 1 },
        refunds: { $sum: '$refundedToWallet' },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  res.status(200).json({
    year,
    report,
  });
});

export const getReturnsAndComplaintsReport = asyncHandler(async (req, res) => {
  const [returnsByStatus, complaintsByStatus, mostReturnedProducts, totalRefunded] = await Promise.all([
    ReturnRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, refunded: { $sum: '$refundAmount' } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Most returned products (by item name in return items array)
    ReturnRequest.aggregate([
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$items.productName',
          returnCount: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { returnCount: -1 } },
      { $limit: 5 },
    ]),
    ReturnRequest.aggregate([
      { $match: { status: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } },
    ]),
  ]);

  const totalReturns = returnsByStatus.reduce((sum, r) => sum + r.count, 0);
  const approvedCount = returnsByStatus.find((r) => r._id === 'approved')?.count || 0;
  const rejectedCount = returnsByStatus.find((r) => r._id === 'rejected')?.count || 0;
  const totalComplaints = complaintsByStatus.reduce((sum, c) => sum + c.count, 0);

  // Average complaint resolution time (resolved/closed only)
  const resolutionData = await Complaint.aggregate([
    { $match: { status: { $in: ['resolved', 'closed'] }, resolvedAt: { $ne: null } } },
    {
      $project: {
        resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id: null,
        avgResolutionMs: { $avg: '$resolutionMs' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgResolutionHours = resolutionData[0]
    ? Math.round(resolutionData[0].avgResolutionMs / 1000 / 3600)
    : null;

  res.status(200).json({
    returnsByStatus,
    complaintsByStatus,
    mostReturnedProducts,
    summary: {
      totalReturns,
      approvedCount,
      rejectedCount,
      approvalRate: totalReturns > 0 ? Math.round((approvedCount / totalReturns) * 100) : 0,
      rejectionRate: totalReturns > 0 ? Math.round((rejectedCount / totalReturns) * 100) : 0,
      totalRefunded: totalRefunded[0]?.total || 0,
      totalComplaints,
      avgResolutionHours,
    },
  });
});

export const downloadSalesReportPdf = asyncHandler(async (req, res) => {
  const { from, to } = getDateRangeFromQuery(req.query);
  const dateRangeLabel = `${formatDate(from)} - ${formatDate(to)}`;

  const matchStage = {
    createdAt: {
      $gte: from,
      $lte: to,
    },
  };

  const [summaryRows, paymentBreakdown, dailyRows] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSales: { $sum: '$subtotal' },
          totalRevenue: { $sum: '$total' },
          promoDiscounts: { $sum: '$promoDiscount' },
          giftCardCredits: { $sum: '$giftCardAmount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                date: '$createdAt',
                format: '%Y-%m-%d',
              },
            },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          discounts: { $sum: { $add: ['$promoDiscount', '$giftCardAmount'] } },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
  ]);

  const summary = summaryRows[0] || {
    totalOrders: 0,
    totalSales: 0,
    totalRevenue: 0,
    promoDiscounts: 0,
    giftCardCredits: 0,
  };
  const totalDiscountsApplied = Number(summary.promoDiscounts || 0) + Number(summary.giftCardCredits || 0);

  const doc = createReportDocument(res, `sales-report-${from.toISOString().slice(0, 10)}.pdf`);
  let y = drawReportHeader(doc, {
    title: 'Sales Report',
    dateRangeLabel,
  });

  const summaryTableRows = [
    { metric: 'Date Range', value: dateRangeLabel },
    { metric: 'Total Sales', value: currency(summary.totalSales) },
    { metric: 'Total Orders', value: Number(summary.totalOrders || 0) },
    { metric: 'Total Revenue', value: currency(summary.totalRevenue) },
    { metric: 'Discounts Applied', value: currency(totalDiscountsApplied) },
  ];

  y = drawTable(doc, {
    title: 'Summary',
    startY: y,
    columns: [
      { key: 'metric', label: 'Metric', width: 295 },
      { key: 'value', label: 'Value', width: 212, align: 'right' },
    ],
    rows: summaryTableRows,
  });

  y = drawTable(doc, {
    title: 'Payment Method Breakdown',
    startY: y,
    columns: [
      { key: 'method', label: 'Payment Method', width: 195 },
      { key: 'orders', label: 'Orders', width: 102, align: 'right' },
      { key: 'revenue', label: 'Revenue', width: 210, align: 'right' },
    ],
    rows: paymentBreakdown.map((row) => ({
      method: String(row._id || 'unknown').replace(/_/g, ' ').toUpperCase(),
      orders: Number(row.totalOrders || 0),
      revenue: currency(row.totalRevenue),
    })),
  });

  y = drawTable(doc, {
    title: 'Daily Sales Activity',
    startY: y,
    columns: [
      { key: 'date', label: 'Date', width: 130 },
      { key: 'orders', label: 'Orders', width: 90, align: 'right' },
      { key: 'discounts', label: 'Discounts', width: 130, align: 'right' },
      { key: 'revenue', label: 'Revenue', width: 157, align: 'right' },
    ],
    rows: dailyRows.map((row) => ({
      date: row._id.date,
      orders: Number(row.totalOrders || 0),
      discounts: currency(row.discounts),
      revenue: currency(row.totalRevenue),
    })),
  });

  if (dailyRows.length === 0) {
    doc
      .fillColor('#64748b')
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('No orders found in the selected date range.', doc.page.margins.left, y);
  }

  addPageNumbers(doc);
  doc.end();
});

export const downloadStockReportPdf = asyncHandler(async (req, res) => {
  const inventoryRows = await Inventory.find()
    .populate({
      path: 'product',
      select: 'name category categories',
      populate: { path: 'categories', select: 'name' },
    })
    .sort({ updatedAt: -1 });

  const stockRows = inventoryRows
    .map((entry) => {
      const product = entry.product;
      if (!product) return null;

      const categoryNames = Array.isArray(product.categories) && product.categories.length
        ? product.categories.map((item) => item.name).filter(Boolean).join(', ')
        : String(product.category || 'Uncategorized');
      const isLowStock = Number(entry.stock || 0) <= Number(entry.lowStockThreshold || 0);

      return {
        productName: product.name,
        category: categoryNames,
        stock: Number(entry.stock || 0),
        threshold: Number(entry.lowStockThreshold || 0),
        indicator: isLowStock ? 'LOW' : 'OK',
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.indicator === b.indicator) return a.stock - b.stock;
      return a.indicator === 'LOW' ? -1 : 1;
    });

  const lowStockCount = stockRows.filter((row) => row.indicator === 'LOW').length;
  const doc = createReportDocument(res, `stock-report-${new Date().toISOString().slice(0, 10)}.pdf`);

  let y = drawReportHeader(doc, {
    title: 'Stock Report',
    dateRangeLabel: '',
  });

  y = drawTable(doc, {
    title: 'Inventory Summary',
    startY: y,
    columns: [
      { key: 'metric', label: 'Metric', width: 295 },
      { key: 'value', label: 'Value', width: 212, align: 'right' },
    ],
    rows: [
      { metric: 'Total Products', value: stockRows.length },
      { metric: 'Low Stock Products', value: lowStockCount },
      { metric: 'Generated Date', value: formatDate(new Date()) },
    ],
  });

  y = drawTable(doc, {
    title: 'Stock Levels',
    startY: y,
    columns: [
      { key: 'productName', label: 'Product Name', width: 130 },
      { key: 'category', label: 'Category', width: 150 },
      { key: 'stock', label: 'Current Stock', width: 75, align: 'right' },
      { key: 'threshold', label: 'Threshold', width: 75, align: 'right' },
      { key: 'indicator', label: 'Low Stock', width: 77, align: 'center' },
    ],
    rows: stockRows,
  });

  if (stockRows.length === 0) {
    doc
      .fillColor('#64748b')
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('No inventory records found.', doc.page.margins.left, y);
  }

  addPageNumbers(doc);
  doc.end();
});

export const downloadReturnsComplaintsPdf = asyncHandler(async (req, res) => {
  const { from, to } = getDateRangeFromQuery(req.query);
  const dateRangeLabel = `${formatDate(from)} - ${formatDate(to)}`;

  const matchStage = { createdAt: { $gte: from, $lte: to } };

  const [returnsByStatus, complaintsByStatus, mostReturnedProducts, recentReturns, recentComplaints] =
    await Promise.all([
      ReturnRequest.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 }, totalRefunded: { $sum: '$refundAmount' } } },
        { $sort: { count: -1 } },
      ]),
      Complaint.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ReturnRequest.aggregate([
        { $match: matchStage },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$items.productName', returnCount: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { returnCount: -1 } },
        { $limit: 10 },
      ]),
      ReturnRequest.find(matchStage)
        .populate('user', 'name email')
        .populate('order', 'total')
        .sort({ createdAt: -1 })
        .limit(50),
      Complaint.find(matchStage)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

  const totalReturns = returnsByStatus.reduce((s, r) => s + r.count, 0);
  const approvedCount = returnsByStatus.find((r) => r._id === 'approved')?.count || 0;
  const rejectedCount = returnsByStatus.find((r) => r._id === 'rejected')?.count || 0;
  const totalRefunded = returnsByStatus.reduce((s, r) => s + (r.totalRefunded || 0), 0);
  const totalComplaints = complaintsByStatus.reduce((s, c) => s + c.count, 0);

  const doc = createReportDocument(res, `returns-complaints-report-${from.toISOString().slice(0, 10)}.pdf`);
  let y = drawReportHeader(doc, { title: 'Returns & Complaints Report', dateRangeLabel });

  y = drawTable(doc, {
    title: 'Summary',
    startY: y,
    columns: [
      { key: 'metric', label: 'Metric', width: 295 },
      { key: 'value', label: 'Value', width: 212, align: 'right' },
    ],
    rows: [
      { metric: 'Date Range', value: dateRangeLabel },
      { metric: 'Total Return Requests', value: totalReturns },
      { metric: 'Approved Returns', value: approvedCount },
      { metric: 'Rejected Returns', value: rejectedCount },
      {
        metric: 'Approval Rate',
        value: totalReturns > 0 ? `${Math.round((approvedCount / totalReturns) * 100)}%` : 'N/A',
      },
      { metric: 'Total Refunded', value: currency(totalRefunded) },
      { metric: 'Total Complaints', value: totalComplaints },
    ],
  });

  y = drawTable(doc, {
    title: 'Returns by Status',
    startY: y,
    columns: [
      { key: 'status', label: 'Status', width: 195 },
      { key: 'count', label: 'Count', width: 102, align: 'right' },
      { key: 'refunded', label: 'Refunded Amount', width: 210, align: 'right' },
    ],
    rows: returnsByStatus.map((r) => ({
      status: String(r._id || '').replace(/_/g, ' ').toUpperCase(),
      count: r.count,
      refunded: currency(r.totalRefunded || 0),
    })),
  });

  if (mostReturnedProducts.length > 0) {
    y = drawTable(doc, {
      title: 'Most Returned Products',
      startY: y,
      columns: [
        { key: 'product', label: 'Product', width: 355 },
        { key: 'count', label: 'Return Count', width: 152, align: 'right' },
      ],
      rows: mostReturnedProducts.map((p) => ({
        product: p._id || 'Unknown',
        count: p.returnCount,
      })),
    });
  }

  y = drawTable(doc, {
    title: 'Complaints by Status',
    startY: y,
    columns: [
      { key: 'status', label: 'Status', width: 295 },
      { key: 'count', label: 'Count', width: 212, align: 'right' },
    ],
    rows: complaintsByStatus.map((c) => ({
      status: String(c._id || '').replace(/_/g, ' ').toUpperCase(),
      count: c.count,
    })),
  });

  if (recentReturns.length > 0) {
    y = drawTable(doc, {
      title: 'Return Requests Detail',
      startY: y,
      columns: [
        { key: 'id', label: 'Return ID', width: 80 },
        { key: 'customer', label: 'Customer', width: 120 },
        { key: 'reason', label: 'Reason', width: 120 },
        { key: 'status', label: 'Status', width: 75 },
        { key: 'refund', label: 'Refund', width: 85, align: 'right' },
        { key: 'date', label: 'Date', width: 27 },
      ],
      rows: recentReturns.map((r) => ({
        id: `#${String(r._id).slice(-6).toUpperCase()}`,
        customer: r.user?.name || 'N/A',
        reason: String(r.reasonType || r.reason || '').replace(/_/g, ' '),
        status: String(r.status || '').replace(/_/g, ' '),
        refund: currency(r.refundAmount),
        date: formatDate(r.createdAt),
      })),
    });
  }

  if (recentComplaints.length > 0) {
    y = drawTable(doc, {
      title: 'Complaints Detail',
      startY: y,
      columns: [
        { key: 'id', label: 'ID', width: 80 },
        { key: 'customer', label: 'Customer', width: 120 },
        { key: 'subject', label: 'Subject', width: 200 },
        { key: 'status', label: 'Status', width: 85 },
        { key: 'date', label: 'Date', width: 22 },
      ],
      rows: recentComplaints.map((c) => ({
        id: c.complaintId || `#${String(c._id).slice(-6).toUpperCase()}`,
        customer: c.user?.name || 'N/A',
        subject: c.subject,
        status: String(c.status || '').replace(/_/g, ' '),
        date: formatDate(c.createdAt),
      })),
    });
  }

  addPageNumbers(doc);
  doc.end();
});
