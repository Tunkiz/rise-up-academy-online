import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const PaymentProofUpload = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Fetch user's enrolled subjects only
  const { data: subjects } = useQuery({
    queryKey: ['user-enrolled-subjects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_subjects')
        .select(`
          subjects (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('subjects(name)');
      if (error) throw error;
      return data?.map(item => item.subjects).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  // Fetch user's enrollment status
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['user-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          subjects (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadPaymentProofMutation = useMutation({
    mutationFn: async (data: {
      subjectId: string;
      paymentMethod: string;
      paymentReference: string;
      paymentAmount: string;
      file: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      // Upload file to payment-proofs bucket
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-payment-proof.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, data.file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Create or update enrollment record
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          subject_id: data.subjectId,
          tenant_id: profile.tenant_id,
          status: 'payment_submitted',
          payment_method: data.paymentMethod as any,
          payment_reference: data.paymentReference,
          payment_amount: parseFloat(data.paymentAmount),
          payment_proof_url: publicUrl,
          payment_proof_filename: data.file.name,
          payment_proof_uploaded_at: new Date().toISOString(),
        });

      if (enrollmentError) {
        throw new Error(`Failed to create enrollment: ${enrollmentError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-enrollments'] });
      toast.success('Payment proof uploaded successfully! Your enrollment is now pending approval.');
      setSelectedFile(null);
      setPaymentMethod("");
      setPaymentReference("");
      setPaymentAmount("");
      setSelectedSubjectId("");
    },
    onError: (error) => {
      toast.error(`Failed to upload payment proof: ${error.message}`);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'payment_approved':
      case 'enrollment_active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'payment_rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'payment_submitted':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_approved':
      case 'enrollment_active':
        return <Badge variant="default">Approved</Badge>;
      case 'payment_rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'pending_payment':
        return <Badge variant="outline">Payment Required</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (!paymentReference.trim()) {
      toast.error('Please provide a payment reference');
      return;
    }
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a payment proof file');
      return;
    }

    uploadPaymentProofMutation.mutate({
      subjectId: selectedSubjectId,
      paymentMethod,
      paymentReference,
      paymentAmount,
      file: selectedFile,
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>My Enrollments</CardTitle>
          <CardDescription>Track your subject enrollment status and payment approvals</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(enrollment.status)}
                    <div>
                      <p className="font-medium">{enrollment.subjects?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.payment_amount && `R${enrollment.payment_amount}`}
                        {enrollment.payment_reference && ` • Ref: ${enrollment.payment_reference}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {getStatusBadge(enrollment.status)}
                    {enrollment.rejection_reason && (
                      <p className="text-xs text-red-600">{enrollment.rejection_reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No enrollments yet. Submit a payment proof below to get started.</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Payment Proof Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Payment Proof
          </CardTitle>
          <CardDescription>
            Upload proof of payment to enroll in a new subject. An admin will review and approve your payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="paymentAmount">Payment Amount (R)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="paymentReference">Payment Reference</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, check number, etc."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentProof">Payment Proof</Label>
              <Input
                id="paymentProof"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png"
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload a receipt, bank statement, or screenshot. Supported formats: PDF, JPG, PNG
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={uploadPaymentProofMutation.isPending}
              className="w-full"
            >
              {uploadPaymentProofMutation.isPending ? "Uploading..." : "Submit Payment Proof"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProofUpload;