import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function can be called by a cron job or scheduler
    await processReminders()
    
    return new Response(
      JSON.stringify({ success: true, message: 'Reminders processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in reminder-scheduler:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processReminders() {
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000))
  const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
  
  // Find enrollments that need reminders
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, user_id, status, created_at, updated_at')
    .in('status', ['pending_payment', 'pending_review', 'payment_rejected'])
    .lt('created_at', twoDaysAgo.toISOString())
  
  if (error) {
    console.error('Error fetching enrollments for reminders:', error)
    return
  }

  if (!enrollments || enrollments.length === 0) {
    console.log('No enrollments found that need reminders')
    return
  }

  for (const enrollment of enrollments) {
    const createdAt = new Date(enrollment.created_at)
    const updatedAt = new Date(enrollment.updated_at)
    
    // Check if we should send a reminder based on status and timing
    let shouldSendReminder = false
    let reminderType = ''
    
    switch (enrollment.status) {
      case 'pending_payment':
        // Send reminder if created more than 2 days ago
        if (createdAt <= twoDaysAgo) {
          shouldSendReminder = true
          reminderType = 'payment_reminder'
        }
        break
        
      case 'pending_review':
        // Send reminder if pending for more than 2 days
        if (updatedAt <= twoDaysAgo) {
          shouldSendReminder = true
          reminderType = 'review_reminder'
        }
        break
        
      case 'payment_rejected': {
        // Send reminder if rejected more than 1 day ago
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
        if (updatedAt <= oneDayAgo) {
          shouldSendReminder = true
          reminderType = 'resubmission_reminder'
        }
        break
      }
    }
    
    if (shouldSendReminder) {
      // Check if we've already sent a reminder recently (within 24 hours)
      const { data: recentReminder } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', enrollment.user_id)
        .eq('type', 'reminder')
        .contains('data', { enrollment_id: enrollment.id })
        .gte('created_at', new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString())
        .limit(1)
      
      if (!recentReminder || recentReminder.length === 0) {
        await sendReminderNotification(enrollment, reminderType)
      }
    }
  }
}

interface EnrollmentForReminder {
  id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
}

async function sendReminderNotification(enrollment: EnrollmentForReminder, reminderType: string) {
  let message = ''
  let title = ''
  
  switch (reminderType) {
    case 'payment_reminder':
      title = 'Payment Proof Required'
      message = 'Don\'t forget to upload your payment proof to complete your enrollment. Your application is still pending.'
      break
      
    case 'review_reminder':
      title = 'Payment Under Review'
      message = 'Your payment proof is still under review. We\'ll notify you once it\'s processed. Thank you for your patience.'
      break
      
    case 'resubmission_reminder':
      title = 'Resubmission Required'
      message = 'Your payment proof was rejected. Please review the admin notes and resubmit to continue with your enrollment.'
      break
      
    default:
      return
  }
  
  // Create notification
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: enrollment.user_id,
      type: 'reminder',
      title,
      message,
      data: {
        enrollment_id: enrollment.id,
        reminder_type: reminderType
      },
      created_at: new Date().toISOString()
    })
  
  if (error) {
    console.error('Failed to create reminder notification:', error)
  } else {
    console.log(`Sent ${reminderType} reminder for enrollment ${enrollment.id}`)
  }
}
