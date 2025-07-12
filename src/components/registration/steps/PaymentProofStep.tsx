import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  CreditCard, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { MultiStepRegistrationData, PaymentMethod } from '@/types/enrollment';

interface PaymentProofStepProps {
  data: MultiStepRegistrationData;
  onChange: (updates: Partial<MultiStepRegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

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

export const PaymentProofStep: React.FC<PaymentProofStepProps> = ({
  data,
  onChange,
  onNext,
  onPrevious,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (!data.paymentReference.trim()) {
      newErrors.paymentReference = 'Payment reference is required';
    }

    if (data.paymentProofs.length === 0) {
      newErrors.paymentProofs = 'At least one payment proof is required';
    }

    if (data.totalAmount <= 0) {
      newErrors.totalAmount = 'Invalid total amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const fileErrors: string[] = [];

    Array.from(files).forEach(file => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        fileErrors.push(`${file.name}: Invalid file type. Please upload JPG, PNG, GIF, WEBP, or PDF files.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        fileErrors.push(`${file.name}: File size exceeds 10MB limit.`);
        return;
      }

      newFiles.push(file);
    });

    if (fileErrors.length > 0) {
      setErrors({ ...errors, fileErrors: fileErrors.join('\n') });
      return;
    }

    const updatedFiles = [...data.paymentProofs, ...newFiles];
    onChange({ paymentProofs: updatedFiles });
    setErrors({ ...errors, paymentProofs: '', fileErrors: '' });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = (index: number) => {
    const updatedFiles = data.paymentProofs.filter((_, i) => i !== index);
    onChange({ paymentProofs: updatedFiles });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Selected Subjects</p>
              <p className="font-medium">{data.selectedSubjects.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium text-primary">${data.totalAmount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select 
              value={data.paymentMethod} 
              onValueChange={(value: PaymentMethod) => onChange({ paymentMethod: value })}
            >
              <SelectTrigger className={errors.paymentMethod ? 'border-red-500' : ''}>
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
            {errors.paymentMethod && (
              <p className="text-sm text-red-500">{errors.paymentMethod}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentReference">Payment Reference *</Label>
            <Input
              id="paymentReference"
              type="text"
              placeholder="Enter transaction ID, reference number, or description"
              value={data.paymentReference}
              onChange={(e) => onChange({ paymentReference: e.target.value })}
              className={errors.paymentReference ? 'border-red-500' : ''}
            />
            {errors.paymentReference && (
              <p className="text-sm text-red-500">{errors.paymentReference}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Include transaction ID, receipt number, or any reference that helps identify your payment
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Proof Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Payment Proof
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please upload clear images or documents showing your payment. Accepted formats: JPG, PNG, GIF, WEBP, PDF (max 10MB each).
            </AlertDescription>
          </Alert>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : errors.paymentProofs
                ? 'border-red-500 bg-red-50'
                : 'border-muted-foreground/25 hover:border-primary'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, GIF, WEBP, PDF up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              title="Upload payment proof files"
            />
          </div>

          {errors.paymentProofs && (
            <p className="text-sm text-red-500">{errors.paymentProofs}</p>
          )}

          {errors.fileErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">
                {errors.fileErrors}
              </AlertDescription>
            </Alert>
          )}

          {/* Uploaded Files */}
          {data.paymentProofs.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files</Label>
              <div className="space-y-2">
                {data.paymentProofs.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="text-sm font-medium">{file.name}</span>
                      </div>
                      <Badge variant="outline">{formatFileSize(file.size)}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {data.paymentProofs.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payment proof uploaded successfully! Your enrollment will be reviewed by our admin team.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={handleNext} className="min-w-[120px]">
          Next Step
        </Button>
      </div>
    </div>
  );
};
