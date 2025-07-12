// Test script to check if the temporary account system is working
const { createClient } = require('@supabase/supabase-js');

// Using the same config as in the app
const supabaseUrl = 'https://hqwbmxjvfyynqtwtygjj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxd2JteGp2Znl5bnF0d3R5Z2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgyMjY2MjUsImV4cCI6MjAzMzgwMjYyNX0.rVjcxPIWZ0FfDhIRLe1LKgNvg6F3mLxBU7wZXKNhzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTemporaryAccountSystem() {
  console.log('Testing temporary account system...\n');
  
  // Test 1: Check if the account_status_view exists
  console.log('1. Testing account_status_view...');
  try {
    const { data, error } = await supabase
      .from('account_status_view')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ account_status_view error:', error.message);
    } else {
      console.log('✅ account_status_view exists');
      console.log('   Sample data:', data);
    }
  } catch (e) {
    console.log('❌ account_status_view exception:', e.message);
  }
  
  // Test 2: Check if the account_status enum exists
  console.log('\n2. Testing account_status enum...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('account_status')
      .limit(1);
    
    if (error) {
      console.log('❌ account_status column error:', error.message);
    } else {
      console.log('✅ account_status column exists');
      console.log('   Sample data:', data);
    }
  } catch (e) {
    console.log('❌ account_status column exception:', e.message);
  }
  
  // Test 3: Check if the RPC functions exist
  console.log('\n3. Testing RPC functions...');
  try {
    const { data, error } = await supabase.rpc('is_account_expired', { user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (error) {
      console.log('❌ is_account_expired RPC error:', error.message);
    } else {
      console.log('✅ is_account_expired RPC exists');
    }
  } catch (e) {
    console.log('❌ is_account_expired RPC exception:', e.message);
  }
  
  try {
    const { data, error } = await supabase.rpc('promote_temporary_account', { user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (error) {
      console.log('❌ promote_temporary_account RPC error:', error.message);
    } else {
      console.log('✅ promote_temporary_account RPC exists');
    }
  } catch (e) {
    console.log('❌ promote_temporary_account RPC exception:', e.message);
  }
  
  // Test 4: Test subjects table (should work)
  console.log('\n4. Testing subjects table...');
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ subjects table error:', error.message);
    } else {
      console.log('✅ subjects table exists');
      console.log('   Sample data:', data);
    }
  } catch (e) {
    console.log('❌ subjects table exception:', e.message);
  }
  
  console.log('\n--- Test completed ---');
}

testTemporaryAccountSystem().catch(console.error);
