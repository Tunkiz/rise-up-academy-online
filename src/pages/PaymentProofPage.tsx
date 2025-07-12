import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  CreditCard, 
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useEnrollments, useCreateEnrollment, useUploadPaymentProof } from '@/hooks/useEnrollments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethod } from '@/types/enrollment';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'credit_card', label: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'paypal', label: 'PayPal', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'cryptocurrency', label: 'Cryptocurrency', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'cash', label: 'Cash', icon: <DollarSign className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <CreditCard className="w-4 h-4" /> },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

const PaymentProofPage: React.FC = () => {
  const { toast } = useToast();
  const { data: enrollments = [], isLoading: enrollmentsLoading, refetch: refetchEnrollments } = useEnrollments();
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });
  const createEnrollment = useCreateEnrollment();
  const uploadPaymentProof = useUploadPaymentProof();

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Filter subjects that user isn't enrolled in yet or has pending payments
  const availableSubjects = subjects.filter(subject => {
    const enrollment = enrollments.find(e => e.subject_id === subject.id);
    return !enrollment || enrollment.status === 'pending_payment';
  });

  // Get existing enrollments by status
  const submittedEnrollments = enrollments.filter(e => e.status === 'payment_submitted');
  const activeEnrollments = enrollments.filter(e => e.status === 'enrollment_active');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large (max 10MB)`);
        return;
      }

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name} has an unsupported file type`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast({
        title: "File Upload Errors",
        description: errors.join(', '),
        variant: "destructive",
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-green-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubjectToggle = (subjectId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedSubjects(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
    }
  };

  const calculateTotalAmount = () => {
    return selectedSubjects.reduce((total, subjectId) => {
      const subject = subjects.find(s => s.id === subjectId);
      return total + (subject?.price || 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "No Subjects Selected",
        description: "Please select at least one subject to enroll in.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No Payment Proof",
        description: "Please upload proof of payment.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentReference.trim()) {
      toast({
        title: "Missing Payment Reference",
        description: "Please provide a payment reference or transaction ID.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const totalAmount = calculateTotalAmount();
      const amountPerSubject = totalAmount / selectedSubjects.length;

      // Create enrollments for each selected subject
      const enrollmentPromises = selectedSubjects.map(async (subjectId, index) => {
        setUploadProgress((index / selectedSubjects.length) * 50);
        
        const enrollment = await createEnrollment.mutateAsync({
          subject_id: subjectId,
          payment_method: paymentMethod,
          payment_amount: amountPerSubject,
          payment_reference: paymentReference,
        });

        // Upload payment proof for the enrollment
        await uploadPaymentProof.mutateAsync({
          file: selectedFiles[0], // Use first file for all enrollments
          enrollment_id: enrollment.id,
          payment_method: paymentMethod,
          payment_amount: amountPerSubject,
          payment_reference: paymentReference,
          notes,
        });

        setUploadProgress(((index + 1) / selectedSubjects.length) * 100);
        return enrollment;
      });

      await Promise.all(enrollmentPromises);

      toast({
        title: "Payment Proof Submitted!",
        description: `Successfully submitted payment proof for ${selectedSubjects.length} subjects. Your enrollment is now pending admin approval.`,
      });

      // Reset form
      setSelectedSubjects([]);
      setPaymentReference('');
      setNotes('');
      setSelectedFiles([]);
      setUploadProgress(0);
      
      // Refresh enrollments
      refetchEnrollments();

    } catch (error) {
      console.error('Error submitting payment proof:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'payment_submitted':
        return <Upload className="w-4 h-4 text-blue-500" />;
      case 'payment_approved':
      case 'enrollment_active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'payment_rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending Payment</Badge>;
      case 'payment_submitted':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Under Review</Badge>;
      case 'payment_approved':
        return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>;
      case 'enrollment_active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'payment_rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (enrollmentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">Loading enrollments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Payment & Enrollment</h1>
          <p className="text-gray-600 mt-2">Submit payment proof to upgrade your account and access course materials</p>
        </div>

        {/* Enrollment Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeEnrollments.length}</div>
              <p className="text-xs text-muted-foreground">Fully accessible subjects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{submittedEnrollments.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting admin approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Subjects</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{availableSubjects.length}</div>
              <p className="text-xs text-muted-foreground">Ready for enrollment</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Enrollments Status */}
        {enrollments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enrollments.map((enrollment) => {
                  const subject = subjects.find(s => s.id === enrollment.subject_id);
                  return (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(enrollment.status)}
                        <div>
                          <p className="font-medium">{subject?.name || 'Unknown Subject'}</p>
                          <p className="text-sm text-gray-500">
                            Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(enrollment.status)}
                        {enrollment.payment_amount && (
                          <p className="text-sm text-gray-500 mt-1">
                            ${enrollment.payment_amount}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Proof Upload Form */}
        {availableSubjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Submit Payment Proof
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subject Selection */}
              <div>
                <Label className="text-base font-medium">Select Subjects</Label>
                <p className="text-sm text-gray-500 mb-3">Choose the subjects you want to enroll in</p>
                <div className="space-y-2">
                  {availableSubjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`subject-${subject.id}`}
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={(e) => handleSubjectToggle(subject.id, e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor={`subject-${subject.id}`} className="flex-1 cursor-pointer">
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-sm text-gray-500">${subject.price || 0}</p>
                      </label>
                    </div>
                  ))}
                </div>
                {selectedSubjects.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">Total Amount: ${calculateTotalAmount()}</p>
                    <p className="text-sm text-gray-600">Selected {selectedSubjects.length} subjects</p>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-base font-medium">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          {method.icon}
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Reference */}
              <div>
                <Label htmlFor="payment-reference" className="text-base font-medium">Payment Reference</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, reference number, or receipt number"
                  className="mt-2"
                />
              </div>

              {/* File Upload */}
              <div>
                <Label className="text-base font-medium">Upload Payment Proof</Label>
                <p className="text-sm text-gray-500 mb-3">
                  Upload screenshots, receipts, or bank statements as proof of payment
                </p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <div className="text-sm">
                    <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                      Click to upload
                    </label>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept={ACCEPTED_FILE_TYPES.join(',')}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected Files:</p>
                    {selectedFiles.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file)}
                          <span className="text-sm">{file.name}</span>
                          <Badge variant="outline">{formatFileSize(file.size)}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(selectedFiles.indexOf(file))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-base font-medium">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about the payment..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Progress Bar */}
              {isSubmitting && (
                <div>
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    Submitting payment proof... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedSubjects.length === 0 || selectedFiles.length === 0}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Payment Proof
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> After submitting your payment proof, it will be reviewed by our admin team. 
            You'll receive an email notification once your payment is approved and your account is upgraded. 
            Processing typically takes 1-2 business days.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default PaymentProofPage;
