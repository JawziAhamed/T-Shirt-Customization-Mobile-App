import { Router } from 'express';

import {
  downloadReturnsComplaintsPdf,
  downloadSalesReportPdf,
  downloadStockReportPdf,
  getDashboardAnalytics,
  getMonthlySalesReport,
  getReturnsAndComplaintsReport,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';

const router = Router();

router.use(protect, authorize('admin', 'staff'));

router.get('/dashboard', getDashboardAnalytics);
router.get('/sales/monthly', getMonthlySalesReport);
router.get('/returns-complaints', getReturnsAndComplaintsReport);
router.get('/reports/sales/pdf', authorize('admin'), downloadSalesReportPdf);
router.get('/reports/stock/pdf', authorize('admin'), downloadStockReportPdf);
router.get('/reports/returns-complaints/pdf', authorize('admin'), downloadReturnsComplaintsPdf);

export default router;
