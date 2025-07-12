import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  BookOpen, 
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAllEnrollments, useReviewEnrollment } from '@/hooks/useEnrollments';
import { Enrollment } from '@/types/enrollment';

export const AdminEnrollmentManagement = () => {
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const { data: enrollments, isLoading } = useAllEnrollments();
  const reviewEnrollment = useReviewEnrollment();

  const pendingEnrollments = enrollments?.filter(e => e.status === 'payment_submitted') || [];
  const approvedEnrollments = enrollments?.filter(e => e.status === 'payment_approved') || [];
  const rejectedEnrollments = enrollments?.filter(e => e.status === 'payment_rejected') || [];

  const handleReviewSubmit = async () => {
    if (!selectedEnrollment || !reviewAction) return;

    try {
      await reviewEnrollment.mutateAsync({
        enrollment_id: selectedEnrollment.id,
        status: reviewAction === 'approve' ? 'payment_approved' : 'payment_rejected',
        admin_notes: adminNotes,
        rejection_reason: reviewAction === 'reject' ? rejectionReason : undefined,
      });

      setIsReviewDialogOpen(false);
      setSelectedEnrollment(null);
      setReviewAction(null);
      setAdminNotes('');
      setRejectionReason('');
    } catch (error) {
      console.error('Error reviewing enrollment:', error);
    }
  };

  const openReviewDialog = (enrollment: Enrollment, action: 'approve' | 'reject') => {
    setSelectedEnrollment(enrollment);
    setReviewAction(action);
    setIsReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_submitted':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const EnrollmentTable = ({ title, data, showActions = false }: { 
    title: string; 
    data: Enrollment[]; 
    showActions?: boolean; 
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {title}
          <Badge variant="outline" className="ml-2">{data.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No enrollments found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {showActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {/* @ts-expect-error - profiles is added via join */}
                      <div>
                        <div className="font-medium">{enrollment.profiles?.full_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{enrollment.profiles?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{enrollment.subjects?.name || 'Unknown Subject'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      ${enrollment.payment_amount || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {enrollment.payment_method?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(enrollment.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(enrollment.created_at)}
                    </div>
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Enrollment Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Student</Label>
                                  {/* @ts-expect-error - profiles is added via join */}
                                  <p className="text-sm">{enrollment.profiles?.full_name}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Subject</Label>
                                  <p className="text-sm">{enrollment.subjects?.name}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Payment Amount</Label>
                                  <p className="text-sm">${enrollment.payment_amount}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Payment Method</Label>
                                  <p className="text-sm capitalize">{enrollment.payment_method?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Payment Reference</Label>
                                  <p className="text-sm">{enrollment.payment_reference || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Submitted Date</Label>
                                  <p className="text-sm">{formatDate(enrollment.created_at)}</p>
                                </div>
                              </div>
                              
                              {enrollment.payment_proof_url && (
                                <div>
                                  <Label className="text-sm font-medium">Payment Proof</Label>
                                  <div className="mt-2 p-4 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      <span className="text-sm">{enrollment.payment_proof_filename}</span>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => window.open(enrollment.payment_proof_url, '_blank')}
                                      >
                                        View File
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {enrollment.admin_notes && (
                                <div>
                                  <Label className="text-sm font-medium">Admin Notes</Label>
                                  <p className="text-sm bg-muted p-2 rounded">{enrollment.admin_notes}</p>
                                </div>
                              )}

                              {enrollment.rejection_reason && (
                                <div>
                                  <Label className="text-sm font-medium">Rejection Reason</Label>
                                  <p className="text-sm bg-red-50 p-2 rounded text-red-800">{enrollment.rejection_reason}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openReviewDialog(enrollment, 'approve')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openReviewDialog(enrollment, 'reject')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading enrollments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Enrollment Management</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Total Enrollments: {enrollments?.length || 0}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingEnrollments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedEnrollments.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedEnrollments.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Enrollments */}
      <EnrollmentTable title="Pending Review" data={pendingEnrollments} showActions={true} />

      {/* Approved Enrollments */}
      <EnrollmentTable title="Approved Enrollments" data={approvedEnrollments} />

      {/* Rejected Enrollments */}
      <EnrollmentTable title="Rejected Enrollments" data={rejectedEnrollments} />

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Enrollment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEnrollment && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are about to {reviewAction} the enrollment for{' '}
                  {/* @ts-expect-error - profiles is added via join */}
                  <strong>{selectedEnrollment.profiles?.full_name}</strong> in{' '}
                  <strong>{selectedEnrollment.subjects?.name}</strong>.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                placeholder="Add any notes about this review..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            {reviewAction === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Explain why this enrollment is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsReviewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReviewSubmit}
                disabled={reviewEnrollment.isPending || (reviewAction === 'reject' && !rejectionReason.trim())}
                className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {reviewEnrollment.isPending ? 'Processing...' : `${reviewAction === 'approve' ? 'Approve' : 'Reject'} Enrollment`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
