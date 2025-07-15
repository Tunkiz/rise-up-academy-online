import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, ExternalLink, Eye, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const PaymentApprovalTable = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Only admins (not super admins) can approve payments
  if (!isAdmin || isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Only tenant administrators can approve payments.</p>
        </CardContent>
      </Card>
    );
  }

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['pending-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          subjects (
            id,
            name
          )
        `)
        .in('status', ['payment_submitted', 'pending_payment'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('enrollments')
        .update({
          status: 'payment_approved',
          approved_at: new Date().toISOString(),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
      toast.success('Payment approved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to approve payment: ${error.message}`);
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ enrollmentId, reason }: { enrollmentId: string; reason: string }) => {
      const { error } = await supabase
        .from('enrollments')
        .update({
          status: 'payment_rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
      setRejectionReason("");
      setDialogOpen(false);
      setSelectedEnrollment(null);
      toast.success('Payment rejected.');
    },
    onError: (error) => {
      toast.error(`Failed to reject payment: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_submitted':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'pending_payment':
        return <Badge variant="outline">Payment Required</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReject = () => {
    if (!selectedEnrollment || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectPaymentMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      reason: rejectionReason,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Payment Approvals
          </CardTitle>
          <CardDescription>
            Review and approve student payment submissions. Only tenant administrators can approve payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">User ID: {enrollment.user_id?.slice(0, 8)}...</p>
                        <p className="text-sm text-muted-foreground">
                          Ref: {enrollment.payment_reference || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{enrollment.subjects?.name}</TableCell>
                    <TableCell>
                      {enrollment.payment_amount ? `R${enrollment.payment_amount}` : 'N/A'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {enrollment.payment_method?.replace('_', ' ') || 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                    <TableCell>
                      {enrollment.payment_proof_uploaded_at 
                        ? format(new Date(enrollment.payment_proof_uploaded_at), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {enrollment.payment_proof_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a 
                              href={enrollment.payment_proof_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </a>
                          </Button>
                        )}
                        
                        {enrollment.status === 'payment_submitted' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => approvePaymentMutation.mutate(enrollment.id)}
                              disabled={approvePaymentMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                setSelectedEnrollment(enrollment);
                                setDialogOpen(true);
                              }}
                              disabled={rejectPaymentMutation.isPending}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending payment submissions.</p>
              <p className="text-sm">Students will appear here when they upload payment proofs.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment submission. The student will see this message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEnrollment && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p><strong>Student ID:</strong> {selectedEnrollment.user_id?.slice(0, 8)}...</p>
                <p><strong>Subject:</strong> {selectedEnrollment.subjects?.name}</p>
                <p><strong>Amount:</strong> R{selectedEnrollment.payment_amount}</p>
                <p><strong>Reference:</strong> {selectedEnrollment.payment_reference}</p>
              </div>
            )}
            <div>
              <label htmlFor="rejectionReason" className="text-sm font-medium">
                Rejection Reason
              </label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why this payment is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectPaymentMutation.isPending}
            >
              {rejectPaymentMutation.isPending ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentApprovalTable;