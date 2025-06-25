'use client';

import { toast } from 'sonner';
import { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
  id?: string | number;
  icon?: ReactNode | false;
}

interface UseSonnerToastReturn {
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  dismiss: (id?: string | number) => void;
  dismissAll: () => void;
}

export const useSonnerToast = (enableIcons: boolean = false): UseSonnerToastReturn => {
  const showToast = (type: ToastType, message: string, options?: ToastOptions) => {
    const { icon, ...restOptions } = options || {};
    
    // Determine icon based on enableIcons setting and provided icon
    const finalIcon = enableIcons ? (icon !== undefined ? icon : undefined) : false;
    
    const toastOptions = {
      ...restOptions,
      ...(finalIcon !== undefined && { icon: finalIcon }),
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }
  };

  const showSuccess = (message: string, options?: ToastOptions) => {
    showToast('success', message, options);
  };

  const showError = (message: string, options?: ToastOptions) => {
    showToast('error', message, options);
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    showToast('warning', message, options);
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    showToast('info', message, options);
  };

  const dismiss = (id?: string | number) => {
    toast.dismiss(id);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
    dismiss,
    dismissAll,
  };
};

// Pre-configured toast functions for common leave system use cases
export const useLeaveSystemToasts = (enableIcons: boolean = false) => {
  const { showSuccess, showError, showWarning, showInfo } = useSonnerToast(enableIcons);

  return {
    // Leave Request Actions
    leaveRequestSubmitted: () => showSuccess("Leave request submitted successfully!", {
      duration: 4000,
      description: "Your manager will be notified for approval",
      icon: enableIcons ? '✅' : false,
    }),
    
    leaveRequestApproved: () => showSuccess("Your leave request has been approved!", {
      duration: 5000,
      description: "You can view details in your calendar",
      icon: enableIcons ? '🎉' : false,
      action: {
        label: "View Calendar",
        onClick: () => window.location.href = "/calendar"
      }
    }),
    
    leaveRequestRejected: () => showError("Your leave request has been rejected.", {
      duration: 4000,
      description: "Please contact your manager for more details",
      icon: enableIcons ? '❌' : false,
    }),
    
    leaveRequestCancelled: () => showInfo("Leave request has been cancelled.", {
      duration: 3000,
      description: "The request has been removed from the system",
      icon: enableIcons ? 'ℹ️' : false,
    }),

    // Balance & Validation
    insufficientBalance: () => showError("Insufficient leave balance for this request.", {
      duration: 4000,
      description: "Check your leave balance before submitting",
      icon: enableIcons ? '⚠️' : false,
    }),
    
    overlappingDates: () => showWarning("Selected dates overlap with existing leave.", {
      duration: 4000,
      description: "Please choose different dates",
      icon: enableIcons ? '📅' : false,
    }),

    // System Notifications
    profileUpdated: () => showSuccess("Profile updated successfully!", {
      duration: 3000,
      icon: enableIcons ? '👤' : false,
    }),
    
    settingsSaved: () => showSuccess("Settings saved successfully!", {
      duration: 3000,
      icon: enableIcons ? '⚙️' : false,
    }),
    
    invitationSent: () => showSuccess("Invitation sent successfully!", {
      duration: 4000,
      description: "The team member will receive an email",
      icon: enableIcons ? '📧' : false,
    }),
    
    // Reminders & Alerts
    pendingApprovals: (count: number) => showWarning(`You have ${count} pending leave requests to review.`, {
      duration: 6000,
      description: "Click to view pending requests",
      icon: enableIcons ? '⏰' : false,
      action: {
        label: "Review",
        onClick: () => window.location.href = "/leave"
      }
    }),
    
    upcomingLeave: (days: number) => showInfo(`Your leave starts in ${days} days.`, {
      duration: 5000,
      description: "Don't forget to prepare handover",
      icon: enableIcons ? '📅' : false,
    }),

    // Error States
    networkError: () => showError("Network error. Please try again.", {
      duration: 4000,
      description: "Check your internet connection",
      icon: enableIcons ? '🌐' : false,
    }),
    
    unexpectedError: () => showError("An unexpected error occurred. Please try again.", {
      duration: 4000,
      description: "If the problem persists, contact support",
      icon: enableIcons ? '❌' : false,
    })
  };
}; 