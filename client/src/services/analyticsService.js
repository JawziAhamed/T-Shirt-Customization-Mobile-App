import apiClient from './apiClient';

export const analyticsService = {
  getDashboardAnalytics: () => apiClient.get('/analytics/dashboard'),
  getMonthlySalesReport: (params) => apiClient.get('/analytics/sales/monthly', { params }),
  getReturnsAndComplaintsReport: () => apiClient.get('/analytics/returns-complaints'),
  downloadSalesReportPdf: (params) => apiClient.get('/analytics/reports/sales/pdf', { params, responseType: 'blob' }),
  downloadStockReportPdf: (params) => apiClient.get('/analytics/reports/stock/pdf', { params, responseType: 'blob' }),
  downloadReturnsComplaintsPdf: (params) =>
    apiClient.get('/analytics/reports/returns-complaints/pdf', { params, responseType: 'blob' }),
};
