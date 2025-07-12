// Enhanced enrollment system types
export type EnrollmentStatus = 
  | 'pending_payment'
  | 'payment_submitted'
  | 'payment_approved'
  | 'payment_rejected'
  | 'enrollment_active'
  | 'enrollment_suspended';

export type PaymentMethod = 
  | 'bank_transfer'
  | 'credit_card'
  | 'paypal'
  | 'cryptocurrency'
  | 'cash'
  | 'other';

export interface Enrollment {
  id: string;
  user_id: string;
  subject_id: string;
  tenant_id: string;
  
  // Enrollment status and timestamps
  status: EnrollmentStatus;
  enrolled_at: string;
  payment_due_date?: string;
  approved_at?: string;
  rejected_at?: string;
  
  // Payment information
  payment_method?: PaymentMethod;
  payment_amount?: number;
  payment_currency?: string;
  payment_reference?: string;
  
  // Proof of payment
  payment_proof_url?: string;
  payment_proof_filename?: string;
  payment_proof_uploaded_at?: string;
  
  // Admin review
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  rejection_reason?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Relations
  subjects?: {
    id: string;
    name: string;
    teams_link?: string;
    class_time?: string;
    price?: number;
  };
}

export interface NotificationTemplate {
  id: string;
  template_name: string;
  template_type: string;
  subject_template?: string;
  body_template: string;
  variables?: Record<string, unknown>;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  enrollment_id?: string;
  tenant_id: string;
  notification_type: string;
  channel: string;
  subject?: string;
  message: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentProofUpload {
  file: File;
  enrollment_id: string;
  payment_reference?: string;
  payment_method: PaymentMethod;
  payment_amount: number;
  notes?: string;
}

export interface RegistrationStep {
  step: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface MultiStepRegistrationData {
  // Step 1: Basic Info
  fullName: string;
  email: string;
  password: string;
  subjectCategory: string;
  
  // Step 2: Course Selection
  selectedSubjects: string[];
  
  // Step 3: Confirmation
  termsAccepted: boolean;
  marketingConsent: boolean;
}

// Simplified notification types for UI components
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface SimpleNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  enrollment_id?: string;
  created_at: string;
}
