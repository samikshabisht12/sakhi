const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  content: string;
  is_user_message: boolean;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
}

// Report interfaces
export interface ReportFileInfo {
  id?: string;
  name: string;
  size: number;
  type: string;
  filename?: string;
}

export interface ReportCreate {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  description: string;
  files?: ReportFileInfo[];
}

export interface ReportResponse {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  description: string;
  files: ReportFileInfo[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
}

class ApiService {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (this.accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.accessToken}`,
      };
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401 && this.accessToken) {
          // Only try to refresh if we have an access token (user was logged in)
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              await this.refreshToken();
              // Retry the request with new token
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${this.accessToken}`,
              };
              const retryResponse = await fetch(url, config);
              if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status}`);
              }
              return retryResponse.json();
            } catch (refreshError) {
              // Refresh failed, logout and throw original error
              this.logout();
              throw new Error(`Authentication failed`);
            }
          } else {
            // No refresh token, just logout and throw error
            this.logout();
            throw new Error(`Authentication required`);
          }
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);

      // Check if it's a network error (backend not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Backend server is not running. Please check if the backend server is running on ${API_BASE_URL}`);
      }

      throw error;
    }
  }  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.accessToken = response.access_token;
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    return response;
  }

  async register(data: RegisterData): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.request<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      this.accessToken = response.access_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
    } catch (error) {
      // Refresh failed, logout user
      this.logout();
      throw error;
    }
  }

  logout(): void {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Chat methods
  async getChatSessions(): Promise<ChatSession[]> {
    return this.request<ChatSession[]>('/chat/sessions');
  }

  async createChatSession(title: string): Promise<ChatSession> {
    return this.request<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getChatMessages(sessionId: number): Promise<Message[]> {
    return this.request<Message[]>(`/chat/sessions/${sessionId}/messages`);
  }

  async sendMessage(sessionId: number, content: string): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteChatSession(sessionId: number): Promise<void> {
    await this.request(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async updateSessionTitle(sessionId: number): Promise<{ title: string }> {
    return this.request<{ title: string }>(`/chat/sessions/${sessionId}/title`, {
      method: 'POST',
    });
  }

  // Report API methods
  async createReport(report: ReportCreate): Promise<ReportResponse> {
    return this.request<ReportResponse>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  // Method for creating report with file uploads (FormData)
  async createReportWithFiles(formData: FormData): Promise<ReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to submit report' }));
      throw new Error(errorData.detail || 'Failed to submit report');
    }

    return response.json();
  }

  async getAllReports(statusFilter?: string, search?: string): Promise<ReportResponse[]> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') {
      params.append('status_filter', statusFilter);
    }
    if (search) {
      params.append('search', search);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/reports?${queryString}` : '/api/reports';

    return this.request<ReportResponse[]>(endpoint);
  }

  async getReport(reportId: number): Promise<ReportResponse> {
    return this.request<ReportResponse>(`/api/reports/${reportId}`);
  }

  async updateReportStatus(reportId: number, status: string): Promise<ReportResponse> {
    return this.request<ReportResponse>(`/api/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteReport(reportId: number): Promise<void> {
    return this.request<void>(`/api/reports/${reportId}`, {
      method: 'DELETE',
    });
  }

  async getReportStats(): Promise<ReportStats> {
    return this.request<ReportStats>('/api/reports/stats/summary');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const apiService = new ApiService();
