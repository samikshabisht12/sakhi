import React, { useState, useRef, useEffect } from 'react';
import { FiArrowLeft, FiUpload, FiX, FiChevronDown, FiCheck } from 'react-icons/fi';
import { apiService } from '../services/api';

interface ReportFormProps {
  onBack: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  subject: string;
  description: string;
  files: File[];
}

const ReportForm: React.FC<ReportFormProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    subject: '',
    description: '',
    files: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const harassmentTypes = [
    'Cyberbullying',
    'Online stalking',
    'Identity theft',
    'Revenge porn',
    'Doxxing',
    'Hate speech',
    'Threats and intimidation',
    'Sexual harassment',
    'Other'
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHarassmentTypeSelect = (type: string) => {
    setFormData(prev => ({
      ...prev,
      subject: type
    }));
    setIsDropdownOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'application/pdf'
    ];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not allowed. Please upload images, videos, or PDF files.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone || '');
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('description', formData.description);

      // Add files to FormData
      formData.files.forEach((file) => {
        formDataToSend.append('files', file);
      });

      // Submit directly to API using the API service
      await apiService.createReportWithFiles(formDataToSend);

      setSubmitMessage('Your report has been submitted successfully. We will review it and get back to you soon.');
      setIsSubmitted(true);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          name: '',
          phone: '',
          email: '',
          subject: '',
          description: '',
          files: []
        });
        setSubmitMessage('');
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitMessage('There was an error submitting your report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name && formData.email && formData.subject && formData.description;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-white/10">
        <button
          onClick={onBack}
          className="glass-button p-2 rounded-xl"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold text-white">Report Cyber Harassment</h1>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {isSubmitted ? (
            // Success message only
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="bg-green-500/20 text-green-300 border border-green-500/30 p-6 rounded-xl text-center max-w-md">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Report Submitted Successfully!</h2>
                <p className="text-green-300/90">{submitMessage}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-white/80 leading-relaxed">
                  Your safety and security online is important. Please fill out this form to report any incidents of cyber harassment.
                  All information will be kept confidential and reviewed by our team.
                </p>
              </div>

              {submitMessage && submitMessage.includes('error') && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30">
                  {submitMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Personal Information</h2>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Incident Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Incident Details</h2>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-white/80 mb-2">
                  Type of Harassment *
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent flex items-center justify-between"
                  >
                    <span className={formData.subject ? 'text-white' : 'text-white/50'}>
                      {formData.subject || 'Select harassment type'}
                    </span>
                    <FiChevronDown
                      className={`w-5 h-5 text-white/70 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div
                      className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden"
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

                      <div className="max-h-60 overflow-y-auto py-2">
                        {harassmentTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleHarassmentTypeSelect(type)}
                            className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all duration-200 flex items-center justify-between group ${
                              formData.subject === type ? 'bg-primary-500/20 text-primary-300' : 'text-white'
                            }`}
                          >
                            <span className="text-sm">{type}</span>
                            {formData.subject === type && (
                              <FiCheck className="w-4 h-4 text-primary-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                  placeholder="Please provide a detailed description of the incident, including dates, times, and any relevant context..."
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Evidence (Optional)</h2>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Upload Evidence (Images, Videos, PDFs)
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors"
                  >
                    <FiUpload className="w-8 h-8" />
                    <span>Click to upload files</span>
                    <span className="text-xs">Max 10MB per file. Supports images, videos, and PDFs.</span>
                  </label>
                </div>

                {formData.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-white/80">Uploaded Files:</p>
                    {formData.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <span className="text-white/80 text-sm truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-white/10">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="liquid-glass-submit"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-lg">Submitting Report...</span>
                  </div>
                ) : (
                  <span className="text-lg font-semibold">Submit Report</span>
                )}
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
