import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ReportCreate, ReportStats } from '../services/api';

interface Report {
  id: number;
  name: string;
  phone: string;
  email: string;
  subject: string;
  description: string;
  files: {
    id?: string;
    name: string;
    size: number;
    type: string;
    filename?: string;
  }[];
  created_at: string;
  updated_at: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface AdminContextType {
  isAdminAuthenticated: boolean;
  reports: Report[];
  reportStats: ReportStats | null;
  isLoading: boolean;
  error: string | null;
  loginAdmin: (passcode: string) => boolean;
  logoutAdmin: () => void;
  addReport: (report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  updateReportStatus: (reportId: number, status: Report['status']) => Promise<void>;
  deleteReport: (reportId: number) => Promise<void>;
  loadReports: (statusFilter?: string, search?: string) => Promise<void>;
  loadReportStats: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSCODE = 'sakhi12';

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load admin auth state from localStorage on mount
  useEffect(() => {
    const adminAuth = localStorage.getItem('admin_authenticated');
    if (adminAuth === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  const loginAdmin = (passcode: string): boolean => {
    if (passcode === ADMIN_PASSCODE) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
    setReports([]);
    setReportStats(null);
  };

  const addReport = async (reportData: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    try {
      setIsLoading(true);
      setError(null);

      const reportCreate: ReportCreate = {
        name: reportData.name,
        email: reportData.email,
        phone: reportData.phone,
        subject: reportData.subject,
        description: reportData.description,
        files: reportData.files
      };

      const newReport = await apiService.createReport(reportCreate);

      // Convert API response to our Report interface
      const formattedReport: Report = {
        id: newReport.id,
        name: newReport.name,
        email: newReport.email,
        phone: newReport.phone || '',
        subject: newReport.subject,
        description: newReport.description,
        files: newReport.files,
        created_at: newReport.created_at,
        updated_at: newReport.updated_at,
        status: newReport.status as Report['status']
      };

      setReports(prev => [formattedReport, ...prev]);

      // Refresh stats
      await loadReportStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateReportStatus = async (reportId: number, status: Report['status']) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedReport = await apiService.updateReportStatus(reportId, status);

      setReports(prev =>
        prev.map(report =>
          report.id === reportId ? {
            ...report,
            status: updatedReport.status as Report['status'],
            updated_at: updatedReport.updated_at
          } : report
        )
      );

      // Refresh stats
      await loadReportStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report status');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReport = async (reportId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      await apiService.deleteReport(reportId);

      setReports(prev => prev.filter(report => report.id !== reportId));

      // Refresh stats
      await loadReportStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async (statusFilter?: string, search?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const apiReports = await apiService.getAllReports(statusFilter, search);

      // Convert API responses to our Report interface
      const formattedReports: Report[] = apiReports.map(report => ({
        id: report.id,
        name: report.name,
        email: report.email,
        phone: report.phone || '',
        subject: report.subject,
        description: report.description,
        files: report.files,
        created_at: report.created_at,
        updated_at: report.updated_at,
        status: report.status as Report['status']
      }));

      setReports(formattedReports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReportStats = async () => {
    try {
      const stats = await apiService.getReportStats();
      setReportStats(stats);
    } catch (err) {
      console.error('Failed to load report stats:', err);
      // Don't set error state for stats, as it's not critical
    }
  };

  return (
    <AdminContext.Provider value={{
      isAdminAuthenticated,
      reports,
      reportStats,
      isLoading,
      error,
      loginAdmin,
      logoutAdmin,
      addReport,
      updateReportStatus,
      deleteReport,
      loadReports,
      loadReportStats
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
