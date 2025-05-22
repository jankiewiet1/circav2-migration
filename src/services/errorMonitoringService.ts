import { supabase } from '@/integrations/supabase/client';

interface ErrorLogEntry {
  component: string;
  message: string;
  error_details?: Record<string, any>;
  user_id?: string;
  company_id?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: 'client' | 'server' | 'ai';
}

/**
 * Service for error monitoring and logging
 */
export const ErrorMonitoringService = {
  /**
   * Log an error to the database
   */
  async logError(entry: Omit<ErrorLogEntry, 'created_at'>): Promise<void> {
    try {
      // First, log to console
      const consoleMessage = `[${entry.severity.toUpperCase()}] ${entry.component}: ${entry.message}`;
      
      switch (entry.severity) {
        case 'critical':
        case 'error':
          console.error(consoleMessage, entry.error_details);
          break;
        case 'warning':
          console.warn(consoleMessage, entry.error_details);
          break;
        case 'info':
          console.info(consoleMessage, entry.error_details);
          break;
      }
      
      // Then, try to log to database
      // This would be implemented with a real error logging system in production
      // For now, we'll just log to local storage for development
      ErrorMonitoringService.logToLocalStorage(entry);
      
      // In production, you would send to a real error monitoring service like:
      // await supabase.from('error_logs').insert({
      //   component: entry.component,
      //   message: entry.message,
      //   error_details: entry.error_details,
      //   user_id: entry.user_id,
      //   company_id: entry.company_id,
      //   severity: entry.severity,
      //   source: entry.source
      // });
    } catch (e) {
      // Fallback if database logging fails
      console.error('Failed to log error to database:', e);
    }
  },
  
  /**
   * Log AI processing error
   */
  async logAIError(
    component: string, 
    message: string, 
    details?: Record<string, any>,
    userId?: string,
    companyId?: string
  ): Promise<void> {
    return this.logError({
      component,
      message,
      error_details: details,
      user_id: userId,
      company_id: companyId,
      severity: 'error',
      source: 'ai'
    });
  },
  
  /**
   * Log to local storage (development only)
   */
  logToLocalStorage(entry: Omit<ErrorLogEntry, 'created_at'>): void {
    try {
      // Get existing logs
      const existingLogsJson = localStorage.getItem('error_logs');
      const existingLogs = existingLogsJson ? JSON.parse(existingLogsJson) : [];
      
      // Add new log with timestamp
      const newLog = {
        ...entry,
        created_at: new Date().toISOString()
      };
      
      // Limit to 100 most recent logs
      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);
      
      // Save back to local storage
      localStorage.setItem('error_logs', JSON.stringify(updatedLogs));
    } catch (e) {
      console.error('Failed to log to local storage:', e);
    }
  },
  
  /**
   * Get logs from local storage (development only)
   */
  getLocalLogs(): Array<ErrorLogEntry & { created_at: string }> {
    try {
      const logsJson = localStorage.getItem('error_logs');
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (e) {
      console.error('Failed to get logs from local storage:', e);
      return [];
    }
  },
  
  /**
   * Clear local logs (development only)
   */
  clearLocalLogs(): void {
    localStorage.removeItem('error_logs');
  }
};

export default ErrorMonitoringService; 