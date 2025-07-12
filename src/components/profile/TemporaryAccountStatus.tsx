import React from 'react';
import { useTemporaryAccount, AccountStatus } from '../../hooks/useTemporaryAccount';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, Clock, AlertCircle, CreditCard } from 'lucide-react';

export function TemporaryAccountStatus() {
  const { 
    accountStatus, 
    isLoading, 
    error, 
    getRemainingTime, 
    promoteAccount,
    isPromotingAccount 
  } = useTemporaryAccount();

  // Type assertion to help with TypeScript
  const typedAccountStatus = accountStatus as AccountStatus | undefined;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Loading Account Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!typedAccountStatus) {
    return null;
  }

  const getStatusIcon = () => {
    switch (typedAccountStatus.effective_status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'temporary':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'pending_payment':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'payment_submitted':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'suspended':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (typedAccountStatus.effective_status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active Account</Badge>;
      case 'temporary':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Temporary Account</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired Account</Badge>;
      case 'pending_payment':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending Payment</Badge>;
      case 'payment_submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Payment Submitted</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended Account</Badge>;
      default:
        return <Badge variant="outline">Unknown Status</Badge>;
    }
  };

  const handlePromoteAccount = () => {
    if (typedAccountStatus.id) {
      promoteAccount(typedAccountStatus.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Account Status
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(typedAccountStatus.effective_status === 'temporary' || typedAccountStatus.effective_status === 'pending_payment') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">
                {getRemainingTime() || 'No expiration date set'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Your temporary account provides limited access to course materials. 
              Complete your payment to upgrade to a full account and unlock all features.
            </p>
            <Button
              onClick={handlePromoteAccount}
              className="w-full"
              variant="default"
              disabled={isPromotingAccount}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isPromotingAccount ? 'Processing...' : 'Complete Payment & Upgrade Account'}
            </Button>
          </div>
        )}

        {typedAccountStatus.effective_status === 'payment_submitted' && (
          <div className="space-y-2">
            <p className="text-sm text-blue-600">
              Your payment has been submitted and is being processed. You'll receive confirmation once approved.
            </p>
          </div>
        )}

        {typedAccountStatus.effective_status === 'expired' && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">
              Your temporary account has expired. Please complete your payment to restore access.
            </p>
            <Button
              onClick={handlePromoteAccount}
              className="w-full"
              variant="default"
              disabled={isPromotingAccount}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isPromotingAccount ? 'Processing...' : 'Complete Payment & Restore Access'}
            </Button>
          </div>
        )}

        {typedAccountStatus.effective_status === 'suspended' && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">
              Your account has been suspended. Please contact support for assistance.
            </p>
          </div>
        )}

        {typedAccountStatus.effective_status === 'active' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">
                Full account active - all features unlocked
              </span>
            </div>
            {typedAccountStatus.payment_approved_at && (
              <p className="text-xs text-gray-500">
                Payment approved on {new Date(typedAccountStatus.payment_approved_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {typedAccountStatus.access_level && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Access Level: {typedAccountStatus.access_level}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
