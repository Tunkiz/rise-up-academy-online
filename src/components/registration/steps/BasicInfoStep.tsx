import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Lock, GraduationCap } from 'lucide-react';
import { MultiStepRegistrationData } from '@/types/enrollment';

interface BasicInfoStepProps {
  data: MultiStepRegistrationData;
  onChange: (updates: Partial<MultiStepRegistrationData>) => void;
  onNext: () => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  onNext,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (data.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!data.password) {
      newErrors.password = 'Password is required';
    } else if (data.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!data.subjectCategory) {
      newErrors.subjectCategory = 'Subject category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={data.fullName}
                onChange={(e) => onChange({ fullName: e.target.value })}
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={data.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={data.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectCategory">Subject Category *</Label>
              <Select value={data.subjectCategory} onValueChange={(value) => onChange({ subjectCategory: value })}>
                <SelectTrigger className={errors.subjectCategory ? 'border-red-500' : ''}>
                  <GraduationCap className="h-4 w-4 text-muted-foreground mr-2" />
                  <SelectValue placeholder="Select your subject category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matric_amended">Matric Amended Senior Certificate</SelectItem>
                  <SelectItem value="national_senior">National Senior Certificate</SelectItem>
                  <SelectItem value="senior_phase">Senior Phase Certificate</SelectItem>
                </SelectContent>
              </Select>
              {errors.subjectCategory && (
                <p className="text-sm text-red-500">{errors.subjectCategory}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} className="min-w-[120px]">
          Next Step
        </Button>
      </div>
    </div>
  );
};
