import React, { useState, useEffect, useRef } from 'react';
import {
  FiShield,
  FiLogOut,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiFileText,
  FiDownload,
  FiFilter,
  FiSearch,
  FiEye,
  FiX,
  FiArrowLeft,
  FiChevronDown,
  FiCheck,
  FiTrash2
} from 'react-icons/fi';
import { useAdmin } from '../contexts/AdminContext';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const {
    reports,
    reportStats,
    isLoading,
    error,
    logoutAdmin,
    updateReportStatus,
    deleteReport,
    loadReports,
    loadReportStats
  } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [deletingReportId, setDeletingReportId] = useState<number | null>(null);

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'resolved', label: 'Resolved' }
  ];

  // Load reports and stats when component mounts or filter changes
  useEffect(() => {
    if (reports.length === 0) {
      loadReports(statusFilter === 'all' ? undefined : statusFilter, searchTerm);
    }
    if (!reportStats) {
      loadReportStats();
    }
  }, []);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadReports(statusFilter === 'all' ? undefined : statusFilter, searchTerm);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);  // Filter reports based on search term and status
  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'reviewed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusCount = (status: Report['status']) => {
    return reportStats ? reportStats[status] : 0;
  };

  const handleLogout = () => {
    logoutAdmin();
    onBack();
  };

  const handleFilterSelect = (value: 'all' | 'pending' | 'reviewed' | 'resolved') => {
    setStatusFilter(value);
    setIsFilterDropdownOpen(false);
  };

  const getCurrentFilterLabel = () => {
    return filterOptions.find(option => option.value === statusFilter)?.label || 'All';
  };

  const handleDeleteReport = async (reportId: number, reportName: string) => {
    if (window.confirm(`Are you sure you want to delete the report from ${reportName}? This action cannot be undone.`)) {
      try {
        setDeletingReportId(reportId);
        await deleteReport(reportId);
      } catch (err) {
        console.error('Failed to delete report:', err);
        alert('Failed to delete report. Please try again.');
      } finally {
        setDeletingReportId(null);
      }
    }
  };

  const handleViewFile = (file: any) => {
    // Check if this is a legacy file (without id) or new file (with id)
    if (!file.id) {
      alert(`This file was uploaded before the file storage system was implemented.\n\nFile: ${file.name}\nType: ${file.type}\nSize: ${formatFileSize(file.size)}\n\nOnly the file metadata is available. The actual file content was not stored.`);
      return;
    }

    if (file.type.startsWith('image/')) {
      // For images, open in a new tab using the download endpoint
      const downloadUrl = `${API_BASE_URL}/api/reports/${selectedReport?.id}/files/${file.id}`;
      window.open(downloadUrl, '_blank');
    } else {
      // For non-images, show file info
      alert(`File: ${file.name}\nType: ${file.type}\nSize: ${formatFileSize(file.size)}\n\nClick download to save the file.`);
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      if (!selectedReport) return;

      // Check if this is a legacy file (without id)
      if (!file.id) {
        alert(`This file was uploaded before the file storage system was implemented.\n\nFile: ${file.name}\nType: ${file.type}\nSize: ${formatFileSize(file.size)}\n\nOnly the file metadata is available. The actual file content was not stored and cannot be downloaded.`);
        return;
      }

      const downloadUrl = `${API_BASE_URL}/api/reports/${selectedReport.id}/files/${file.id}`;

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="glass-button p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Back to Chat"
            >
              <FiArrowLeft className="w-5 h-5 text-white/80" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600/20 rounded-full flex items-center justify-center">
                <FiShield className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
                <p className="text-white/70 text-sm">Cyber Harassment Reports Management</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="glass-button px-4 py-2 rounded-xl flex items-center gap-2 text-white/80 hover:text-white"
          >
            <FiLogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats Cards */}
        <div className="p-3 sm:p-6 border-b border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="glass-panel p-3 sm:p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs sm:text-sm">Total Reports</p>
                    <p className="text-lg sm:text-2xl font-semibold text-white">{reportStats?.total || 0}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600/20 rounded-full flex items-center justify-center">
                    <FiFileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                  </div>
                </div>
              </div>          <div className="glass-panel p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs sm:text-sm">Pending</p>
                  <p className="text-lg sm:text-2xl font-semibold text-yellow-300">{getStatusCount('pending')}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs sm:text-sm">Reviewed</p>
                  <p className="text-lg sm:text-2xl font-semibold text-blue-300">{getStatusCount('reviewed')}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <FiEye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs sm:text-sm">Resolved</p>
                  <p className="text-lg sm:text-2xl font-semibold text-green-300">{getStatusCount('resolved')}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <FiDownload className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-white/10">
          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="w-12 sm:w-40 px-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent flex items-center justify-center sm:justify-between"
                title="Filter by status"
              >
                <FiFilter className="w-5 h-5 text-white/50" />
                <span className="hidden sm:inline text-sm">
                  {getCurrentFilterLabel()}
                </span>
                <FiChevronDown
                  className={`hidden sm:block w-4 h-4 text-white/70 transition-transform duration-200 ${
                    isFilterDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFilterDropdownOpen && (
                <div
                  className="absolute z-50 w-40 right-0 sm:w-full mt-2 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {/* Glass effect overlay */}
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      zIndex: -1,
                    }}
                  />

                  <div className="py-2">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFilterSelect(option.value as any)}
                        className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all duration-200 flex items-center justify-between group ${
                          statusFilter === option.value ? 'bg-primary-500/20 text-primary-300' : 'text-white'
                        }`}
                      >
                        <span className="text-sm">{option.label}</span>
                        {statusFilter === option.value && (
                          <FiCheck className="w-4 h-4 text-primary-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 p-6 admin-reports-scroll">
          {error ? (
            <div className="text-center py-12">
              <FiFileText className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Reports</h3>
              <p className="text-white/50 mb-4">{error}</p>
              <button
                onClick={() => loadReports(statusFilter === 'all' ? undefined : statusFilter, searchTerm)}
                className="glass-button px-4 py-2 rounded-xl text-white"
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-medium text-white/70 mb-2">Loading Reports...</h3>
              <p className="text-white/50">Please wait while we fetch the latest reports</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white/70 mb-2">No Reports Found</h3>
              <p className="text-white/50">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No reports have been submitted yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                key={report.id}
                className="glass-panel p-6 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-primary-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiUser className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white truncate">{report.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(report.status)}`}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report.id, report.name);
                      }}
                      disabled={deletingReportId === report.id}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Delete report"
                    >
                      {deletingReportId === report.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiTrash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4 min-w-0">
                  <h4 className="font-medium text-white mb-2 truncate">{report.subject}</h4>
                  <p className="text-white/70 text-sm line-clamp-2 break-words">{report.description}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-white/60 min-w-0">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <FiCalendar className="w-4 h-4" />
                      <span className="whitespace-nowrap">{new Date(report.created_at).toLocaleDateString()}</span>
                    </span>
                    {report.files.length > 0 && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <FiFileText className="w-4 h-4" />
                        <span className="whitespace-nowrap">{report.files.length} file{report.files.length > 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                  <button className="text-primary-400 hover:text-primary-300 transition-colors flex-shrink-0 ml-2 whitespace-nowrap">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Report Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="glass-button p-2 rounded-xl"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FiUser className="w-5 h-5 text-white/60" />
                      <span className="text-white">{selectedReport.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FiMail className="w-5 h-5 text-white/60" />
                      <span className="text-white">{selectedReport.email}</span>
                    </div>
                    {selectedReport.phone && (
                      <div className="flex items-center gap-3">
                        <FiPhone className="w-5 h-5 text-white/60" />
                        <span className="text-white">{selectedReport.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <FiCalendar className="w-5 h-5 text-white/60" />
                      <span className="text-white">{new Date(selectedReport.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Report Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">Current Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'pending')}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          selectedReport.status === 'pending'
                            ? 'bg-yellow-500/30 text-yellow-300'
                            : 'bg-white/10 text-white/70 hover:bg-yellow-500/20'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'reviewed')}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          selectedReport.status === 'reviewed'
                            ? 'bg-blue-500/30 text-blue-300'
                            : 'bg-white/10 text-white/70 hover:bg-blue-500/20'
                        }`}
                      >
                        Reviewed
                      </button>
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          selectedReport.status === 'resolved'
                            ? 'bg-green-500/30 text-green-300'
                            : 'bg-white/10 text-white/70 hover:bg-green-500/20'
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident Details */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Incident Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Type of Harassment</label>
                    <p className="text-white bg-white/5 px-4 py-3 rounded-xl">{selectedReport.subject}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                    <p className="text-white bg-white/5 px-4 py-3 rounded-xl whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>
                </div>
              </div>

              {/* Evidence Files */}
              {selectedReport.files.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Evidence Files</h3>
                  <div className="space-y-2">
                    {selectedReport.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FiFileText className="w-5 h-5 text-white/60 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm truncate">{file.name}</p>
                            <p className="text-white/60 text-xs">{formatFileSize(file.size)} • {file.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {file.id ? (
                            <>
                              {file.type.startsWith('image/') && (
                                <button
                                  onClick={() => handleViewFile(file)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                  title="View image"
                                >
                                  <FiEye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="text-primary-400 hover:text-primary-300 transition-colors p-1"
                                title="Download file"
                              >
                                <FiDownload className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span
                              className="text-yellow-400 text-xs px-2 py-1 bg-yellow-400/10 rounded"
                              title="Legacy file - only metadata available"
                            >
                              Metadata only
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminDashboard;
