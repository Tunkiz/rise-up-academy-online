import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Upload, 
  RefreshCw,
  AlertCircle,
  BookOpen,
  Lock
} from 'lucide-react';
import { useEnrollments } from '@/hooks/useEnrollments';
import { Enrollment } from '@/types/enrollment';

interface EnrollmentGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const EnrollmentGate: React.FC<EnrollmentGateProps> = ({ 
  children, 
  fallback 
}) => {
  const { data: enrollments, isLoading } = useEnrollments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading your enrollment status...</span>
      </div>
    );
  }

  const hasActiveEnrollment = enrollments?.some(e => e.status === 'enrollment_active') || false;
  const hasApprovedPayment = enrollments?.some(e => e.status === 'payment_approved') || false;
  
  if (hasActiveEnrollment || hasApprovedPayment) {
    return <>{children}</>;
  }

  return fallback || <EnrollmentStatusDisplay enrollments={enrollments || []} />;
};

interface EnrollmentStatusDisplayProps {
  enrollments: Enrollment[];
}

const EnrollmentStatusDisplay: React.FC<EnrollmentStatusDisplayProps> = ({ enrollments }) => {
  const pendingPaymentEnrollments = enrollments.filter(e => e.status === 'pending_payment');
  const pendingVerificationEnrollments = enrollments.filter(e => e.status === 'payment_submitted');
  const rejectedEnrollments = enrollments.filter(e => e.status === 'payment_rejected');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Upload className="w-5 h-5 text-orange-500" />;
      case 'payment_submitted':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'payment_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'payment_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Payment Required</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'payment_approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'payment_rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <Lock className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">Dashboard Access Restricted</h1>
        <p className="text-muted-foreground">
          Your enrollment is currently being processed. Please review the status below.
        </p>
      </div>

      {/* No Enrollments */}
      {enrollments.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You haven't enrolled in any courses yet. Please complete the registration process to gain access to the dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Enrollment Status Cards */}
      <div className="grid gap-4">
        {enrollments.map((enrollment) => (
          <Card key={enrollment.id} className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(enrollment.status)}
                  <div>
                    <h3 className="font-semibold">{enrollment.subjects?.name || 'Unknown Subject'}</h3>
                    <p className="text-sm text-muted-foreground">
                      Enrolled on {formatDate(enrollment.created_at)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(enrollment.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Amount</p>
                  <p className="text-lg font-semibold">${enrollment.payment_amount || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="capitalize">{enrollment.payment_method?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference</p>
                  <p className="text-sm">{enrollment.payment_reference || 'N/A'}</p>
                </div>
              </div>

              {/* Status-specific messages */}
              {enrollment.status === 'pending_payment' && (
                <Alert className="bg-orange-50 border-orange-200">
                  <Upload className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Action Required:</strong> Please upload your payment proof to complete enrollment.
                  </AlertDescription>
                </Alert>
              )}

              {enrollment.status === 'payment_submitted' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Under Review:</strong> Your payment proof has been submitted and is being reviewed by our admin team. 
                    This usually takes 1-2 business days.
                  </AlertDescription>
                </Alert>
              )}

              {enrollment.status === 'payment_rejected' && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Payment Rejected:</strong> {enrollment.rejection_reason || 'Please contact support for more information.'}
                  </AlertDescription>
                </Alert>
              )}

              {enrollment.status === 'payment_approved' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Payment Approved:</strong> Your enrollment has been approved! You should have full access to the dashboard shortly.
                  </AlertDescription>
                </Alert>
              )}

              {/* Admin Notes */}
              {enrollment.admin_notes && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Admin Notes:</p>
                  <p className="text-sm">{enrollment.admin_notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {enrollment.status === 'pending_payment' && (
                  <Button onClick={() => window.location.href = '/register'}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Payment Proof
                  </Button>
                )}

                {enrollment.status === 'payment_rejected' && (
                  <Button onClick={() => window.location.href = '/register'}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-submit Payment
                  </Button>
                )}

                {enrollment.payment_proof_url && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(enrollment.payment_proof_url, '_blank')}
                  >
                    View Payment Proof
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Payment Issues:</strong> If you're having trouble with payment verification, 
              please contact our support team with your enrollment details.
            </p>
            <p>
              <strong>Processing Time:</strong> Payment verification typically takes 1-2 business days. 
              We'll send you an email notification once your payment is approved.
            </p>
            <p>
              <strong>Re-submissions:</strong> If your payment was rejected, you can re-submit with 
              the corrected information using the button above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
