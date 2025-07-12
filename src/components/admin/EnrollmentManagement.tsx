import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Eye, 
  Check, 
  X, 
  Clock, 
  Users, 
  DollarSign,
  FileText,
  AlertCircle,
  Download,
  Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Enrollment, EnrollmentStatus } from '@/types/enrollment';

const ENROLLMENT_STATUS_COLORS = {
  'pending_payment': 'bg-yellow-100 text-yellow-800',
  'payment_submitted': 'bg-blue-100 text-blue-800',
  'payment_approved': 'bg-green-100 text-green-800',
  'payment_rejected': 'bg-red-100 text-red-800',
  'enrollment_active': 'bg-green-100 text-green-800',
  'enrollment_suspended': 'bg-gray-100 text-gray-800',
};

const ENROLLMENT_STATUS_ICONS = {
  'pending_payment': <Clock className="w-4 h-4" />,
  'payment_submitted': <FileText className="w-4 h-4" />,
  'payment_approved': <Check className="w-4 h-4" />,
  'payment_rejected': <X className="w-4 h-4" />,
  'enrollment_active': <Check className="w-4 h-4" />,
  'enrollment_suspended': <AlertCircle className="w-4 h-4" />,
};

interface EnrollmentWithDetails extends Enrollment {
  subjects: {
    id: string;
    name: string;
    price: number;
  };
  profiles: {
    id: string;
    full_name: string;
  };
}

const EnrollmentManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus | 'all'>('all');
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentWithDetails | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch enrollments with related data
  const { data: enrollments = [], isLoading: isLoadingEnrollments, refetch } = useQuery({
    queryKey: ['admin-enrollments', selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('enrollments')
        .select(`
          *,
          subjects (
            id,
            name,
            price
          ),
          profiles (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EnrollmentWithDetails[];
    },
  });

  // Get enrollment statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['enrollment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('status');

      if (error) throw error;

      const statusCounts = data.reduce((acc, enrollment) => {
        acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
        return acc;
      }, {} as Record<EnrollmentStatus, number>);

      return {
        total: data.length,
        pending_payment: statusCounts.pending_payment || 0,
        payment_submitted: statusCounts.payment_submitted || 0,
        payment_approved: statusCounts.payment_approved || 0,
        payment_rejected: statusCounts.payment_rejected || 0,
        enrollment_active: statusCounts.enrollment_active || 0,
        enrollment_suspended: statusCounts.enrollment_suspended || 0,
      };
    },
  });

  // Mutation to update enrollment status
  const updateEnrollmentMutation = useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      status, 
      adminNotes, 
      rejectionReason 
    }: { 
      enrollmentId: string; 
      status: EnrollmentStatus;
      adminNotes?: string;
      rejectionReason?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const updateData: Partial<{
        status: EnrollmentStatus;
        reviewed_by: string;
        reviewed_at: string;
        admin_notes: string | null;
        approved_at: string;
        rejected_at: string;
        rejection_reason: string | null;
      }> = {
        status,
        reviewed_by: user.user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      };

      if (status === 'payment_approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'payment_rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason || null;
      }

      const { error } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', enrollmentId);

      if (error) throw error;

      // If approved, also activate the enrollment
      if (status === 'payment_approved') {
        const { error: activateError } = await supabase
          .from('enrollments')
          .update({ status: 'enrollment_active' })
          .eq('id', enrollmentId);
        
        if (activateError) throw activateError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] }); // For student view
      
      // Log activity for the user
      if (selectedEnrollment) {
        const isApproved = variables.status === 'payment_approved';
        const activityMessage = isApproved 
          ? `Payment approved for ${selectedEnrollment.subjects?.name}`
          : `Payment rejected for ${selectedEnrollment.subjects?.name}`;
        
        // Insert activity log
        supabase
          .from('recent_activity')
          .insert({
            user_id: selectedEnrollment.user_id,
            activity: activityMessage,
            course: selectedEnrollment.subjects?.name || 'Unknown Course',
            date: new Date().toISOString(),
          })
          .then(() => {
            console.log('Activity logged successfully');
          })
          .catch((error) => {
            console.error('Error logging activity:', error);
          });
      }
      
      const action = variables.status === 'payment_approved' ? 'approved' : 'rejected';
      toast({
        title: `Enrollment ${action}`,
        description: `The payment has been ${action} and the enrollment status updated.`,
      });
      
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error updating enrollment:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleOpenReviewDialog = (enrollment: EnrollmentWithDetails, action: 'approve' | 'reject') => {
    setSelectedEnrollment(enrollment);
    setReviewAction(action);
    setAdminNotes(enrollment.admin_notes || '');
    setRejectionReason(enrollment.rejection_reason || '');
    setIsReviewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedEnrollment(null);
    setReviewAction(null);
    setAdminNotes('');
    setRejectionReason('');
    setIsReviewDialogOpen(false);
  };

  const handleSubmitReview = () => {
    if (!selectedEnrollment || !reviewAction) return;

    const newStatus: EnrollmentStatus = reviewAction === 'approve' ? 'payment_approved' : 'payment_rejected';
    
    updateEnrollmentMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      status: newStatus,
      adminNotes: adminNotes.trim() || undefined,
      rejectionReason: reviewAction === 'reject' ? rejectionReason.trim() || undefined : undefined,
    });
  };

  const handleDownloadProof = async (enrollment: EnrollmentWithDetails) => {
    if (!enrollment.payment_proof_url) return;

    try {
      const response = await fetch(enrollment.payment_proof_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = enrollment.payment_proof_filename || 'payment-proof';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading proof:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not download the payment proof file.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: EnrollmentStatus) => {
    const colorClass = ENROLLMENT_STATUS_COLORS[status];
    const icon = ENROLLMENT_STATUS_ICONS[status];
    
    return (
      <Badge variant="outline" className={`${colorClass} flex items-center gap-1`}>
        {icon}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoadingEnrollments) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Enrollment Management</h2>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.payment_submitted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.payment_approved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.enrollment_active || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.payment_rejected || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending_payment || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Enrollments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Status:</Label>
            <Select value={selectedStatus} onValueChange={(value: EnrollmentStatus | 'all') => setSelectedStatus(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="payment_submitted">Payment Submitted</SelectItem>
                <SelectItem value="payment_approved">Payment Approved</SelectItem>
                <SelectItem value="payment_rejected">Payment Rejected</SelectItem>
                <SelectItem value="enrollment_active">Active</SelectItem>
                <SelectItem value="enrollment_suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollments ({enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No enrollments found for the selected criteria.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{enrollment.profiles?.full_name}</p>
                        <p className="text-sm text-gray-500">ID: {enrollment.user_id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{enrollment.subjects?.name}</p>
                        <p className="text-sm text-gray-500">
                          ${enrollment.subjects?.price || 0}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${enrollment.payment_amount || 0}</p>
                        <p className="text-sm text-gray-500">{enrollment.payment_currency || 'USD'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="capitalize">{enrollment.payment_method?.replace('_', ' ')}</p>
                        {enrollment.payment_reference && (
                          <p className="text-sm text-gray-500">Ref: {enrollment.payment_reference}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(enrollment.status)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {format(new Date(enrollment.created_at), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(enrollment.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {enrollment.payment_proof_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadProof(enrollment)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {enrollment.status === 'payment_submitted' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenReviewDialog(enrollment, 'approve')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenReviewDialog(enrollment, 'reject')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Enrollment Details</DialogTitle>
                              <DialogDescription>
                                Review enrollment information and payment details
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-medium">Student</Label>
                                  <p>{enrollment.profiles?.full_name}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Subject</Label>
                                  <p>{enrollment.subjects?.name}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Payment Amount</Label>
                                  <p>${enrollment.payment_amount || 0} {enrollment.payment_currency || 'USD'}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Payment Method</Label>
                                  <p className="capitalize">{enrollment.payment_method?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Payment Reference</Label>
                                  <p>{enrollment.payment_reference || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Status</Label>
                                  <div className="mt-1">{getStatusBadge(enrollment.status)}</div>
                                </div>
                              </div>
                              
                              {enrollment.admin_notes && (
                                <div>
                                  <Label className="font-medium">Admin Notes</Label>
                                  <p className="text-sm bg-gray-50 p-2 rounded">{enrollment.admin_notes}</p>
                                </div>
                              )}
                              
                              {enrollment.rejection_reason && (
                                <div>
                                  <Label className="font-medium">Rejection Reason</Label>
                                  <p className="text-sm bg-red-50 p-2 rounded text-red-700">{enrollment.rejection_reason}</p>
                                </div>
                              )}
                              
                              {enrollment.payment_proof_url && (
                                <div>
                                  <Label className="font-medium">Payment Proof</Label>
                                  <div className="mt-2">
                                    <a 
                                      href={enrollment.payment_proof_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      View Payment Proof ({enrollment.payment_proof_filename})
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Approve this payment proof and activate the enrollment.'
                : 'Reject this payment proof and provide a reason.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedEnrollment && (
              <div className="bg-gray-50 p-3 rounded">
                <p><strong>Student:</strong> {selectedEnrollment.profiles?.full_name}</p>
                <p><strong>Subject:</strong> {selectedEnrollment.subjects?.name}</p>
                <p><strong>Amount:</strong> ${selectedEnrollment.payment_amount}</p>
                <p><strong>Reference:</strong> {selectedEnrollment.payment_reference}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this review..."
                rows={3}
              />
            </div>
            
            {reviewAction === 'reject' && (
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejecting this payment..."
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={
                updateEnrollmentMutation.isPending || 
                (reviewAction === 'reject' && !rejectionReason.trim())
              }
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {updateEnrollmentMutation.isPending ? (
                'Processing...'
              ) : (
                reviewAction === 'approve' ? 'Approve Payment' : 'Reject Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnrollmentManagement;
