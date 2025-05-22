/**
 * Security configuration for AI operations
 * Enforces security best practices for AI data processing
 */

import { supabase } from '@/integrations/supabase/client';
import { ErrorMonitoringService } from '@/services/errorMonitoringService';

// Rate limits for AI operations (per user per hour)
export const AI_RATE_LIMITS = {
  CSV_PROCESSING: 20,
  PDF_PROCESSING: 10,
  CHAT_MESSAGES: 100
};

// Maximum file sizes in bytes
export const MAX_FILE_SIZES = {
  CSV: 10 * 1024 * 1024, // 10MB
  EXCEL: 15 * 1024 * 1024, // 15MB
  PDF: 20 * 1024 * 1024, // 20MB
  IMAGE: 8 * 1024 * 1024 // 8MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  CSV: ['.csv'],
  EXCEL: ['.xlsx', '.xls'],
  PDF: ['.pdf'],
  IMAGE: ['.jpg', '.jpeg', '.png']
};

/**
 * Security service for AI operations
 */
export const AISecurityService = {
  /**
   * Check if a user has permission to use AI features
   */
  async checkAIPermission(userId: string): Promise<boolean> {
    try {
      // In production, you would check user permissions from the database
      // For now, we'll simulate this check
      return true;
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'AISecurityService.checkAIPermission',
        message: 'Failed to check AI permission',
        error_details: { error },
        user_id: userId,
        severity: 'error',
        source: 'client'
      });
      
      return false;
    }
  },
  
  /**
   * Check if a file type is allowed
   */
  isFileTypeAllowed(fileName: string): boolean {
    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    
    return (
      ALLOWED_FILE_TYPES.CSV.includes(extension) ||
      ALLOWED_FILE_TYPES.EXCEL.includes(extension) ||
      ALLOWED_FILE_TYPES.PDF.includes(extension) ||
      ALLOWED_FILE_TYPES.IMAGE.includes(extension)
    );
  },
  
  /**
   * Check if a file size is within limits
   */
  isFileSizeAllowed(fileName: string, sizeInBytes: number): boolean {
    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    
    if (ALLOWED_FILE_TYPES.CSV.includes(extension)) {
      return sizeInBytes <= MAX_FILE_SIZES.CSV;
    } else if (ALLOWED_FILE_TYPES.EXCEL.includes(extension)) {
      return sizeInBytes <= MAX_FILE_SIZES.EXCEL;
    } else if (ALLOWED_FILE_TYPES.PDF.includes(extension)) {
      return sizeInBytes <= MAX_FILE_SIZES.PDF;
    } else if (ALLOWED_FILE_TYPES.IMAGE.includes(extension)) {
      return sizeInBytes <= MAX_FILE_SIZES.IMAGE;
    }
    
    return false;
  },
  
  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimit(userId: string, operationType: keyof typeof AI_RATE_LIMITS): Promise<boolean> {
    try {
      // In production, you would check against a rate limiting system
      // For now, we'll simulate this check
      return true;
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'AISecurityService.checkRateLimit',
        message: 'Failed to check rate limit',
        error_details: { error, operationType },
        user_id: userId,
        severity: 'error',
        source: 'client'
      });
      
      return false;
    }
  },
  
  /**
   * Sanitize user inputs for AI processing
   */
  sanitizeUserInput(input: string): string {
    // Remove potential XSS or injection patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  },
  
  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: 'access' | 'error' | 'rate_limit' | 'permission',
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      // In production, you would log to a security events table
      ErrorMonitoringService.logError({
        component: 'AISecurityService',
        message: `Security event: ${eventType}`,
        error_details: details,
        user_id: userId,
        severity: eventType === 'error' ? 'critical' : 'warning',
        source: 'client'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
};

export default AISecurityService; 