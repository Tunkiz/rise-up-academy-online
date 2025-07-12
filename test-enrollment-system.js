// Test script to verify the enhanced enrollment system
import { supabase } from '../src/integrations/supabase/client';

async function testEnrollmentSystem() {
  console.log('🧪 Testing Enhanced Enrollment System...\n');

  try {
    // Test 1: Check if new tables exist
    console.log('1. Checking database tables...');
    
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, payment_status, payment_amount')
      .limit(1);
    
    if (enrollmentError) {
      console.error('❌ Enrollments table not accessible:', enrollmentError.message);
    } else {
      console.log('✅ Enrollments table accessible');
    }

    const { data: notifications, error: notificationError } = await supabase
      .from('notifications')
      .select('id, type, read')
      .limit(1);
    
    if (notificationError) {
      console.error('❌ Notifications table not accessible:', notificationError.message);
    } else {
      console.log('✅ Notifications table accessible');
    }

    // Test 2: Check storage bucket
    console.log('\n2. Checking storage bucket...');
    
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketError) {
      console.error('❌ Storage bucket check failed:', bucketError.message);
    } else {
      const paymentBucket = buckets.find(bucket => bucket.id === 'payment-proofs');
      if (paymentBucket) {
        console.log('✅ Payment proofs bucket exists');
      } else {
        console.log('❌ Payment proofs bucket not found');
      }
    }

    // Test 3: Check Edge Functions
    console.log('\n3. Checking Edge Functions...');
    
    const { data: enrollmentFn, error: enrollmentFnError } = await supabase.functions
      .invoke('enrollment-management', {
        body: { action: 'test' }
      });
    
    if (enrollmentFnError) {
      console.error('❌ Enrollment management function error:', enrollmentFnError.message);
    } else {
      console.log('✅ Enrollment management function accessible');
    }

    const { data: reminderFn, error: reminderFnError } = await supabase.functions
      .invoke('reminder-scheduler', {
        body: { action: 'test' }
      });
    
    if (reminderFnError) {
      console.error('❌ Reminder scheduler function error:', reminderFnError.message);
    } else {
      console.log('✅ Reminder scheduler function accessible');
    }

    // Test 4: Check enrollment statistics function
    console.log('\n4. Checking enrollment statistics...');
    
    const { data: stats, error: statsError } = await supabase
      .rpc('get_enrollment_stats');
    
    if (statsError) {
      console.error('❌ Enrollment statistics function error:', statsError.message);
    } else {
      console.log('✅ Enrollment statistics function working');
      console.log('📊 Current stats:', stats);
    }

    console.log('\n🎉 System test completed!');
    console.log('\nNext steps:');
    console.log('1. Test the registration flow at /register');
    console.log('2. Test admin panel functionality');
    console.log('3. Test file uploads and notifications');
    console.log('4. Monitor Edge Function logs in Supabase Dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEnrollmentSystem();
