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
    const { action, enrollmentId, adminId, ...data } = await req.json()

    switch (action) {
      case 'create_enrollment':
        return await createEnrollment(data)
      case 'upload_payment_proof':
        return await uploadPaymentProof(data)
      case 'admin_review':
        return await adminReview(enrollmentId, adminId, data)
      case 'approve_enrollment':
        return await approveEnrollment(enrollmentId, adminId, data)
      case 'reject_enrollment':
        return await rejectEnrollment(enrollmentId, adminId, data)
      case 'send_reminder':
        return await sendReminder(enrollmentId)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in enrollment-management:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

interface CreateEnrollmentData {
  userId: string
  courseId: string
  paymentMethod: string
  paymentAmount: number
  notes?: string
}

interface UploadPaymentProofData {
  enrollmentId: string
  paymentProofUrl: string
  paymentReference: string
}

interface AdminReviewData {
  status: string
}

interface ApproveEnrollmentData {
  notes?: string
}

interface RejectEnrollmentData {
  notes?: string
}

interface NotificationData {
  enrollment_id?: string
  message: string
  title: string
  [key: string]: unknown
}

async function createEnrollment(data: CreateEnrollmentData) {
  const { userId, courseId, paymentMethod, paymentAmount, notes } = data

  // Create enrollment record
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      payment_method: paymentMethod,
      payment_amount: paymentAmount,
      notes: notes,
      status: 'pending_payment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (enrollmentError) {
    throw new Error(`Failed to create enrollment: ${enrollmentError.message}`)
  }

  // Create notification for user
  await createNotification(userId, 'enrollment_created', {
    enrollment_id: enrollment.id,
    message: 'Your enrollment has been created. Please upload payment proof to continue.',
    title: 'Enrollment Created'
  })

  return new Response(
    JSON.stringify({ success: true, enrollment }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function uploadPaymentProof(data: UploadPaymentProofData) {
  const { enrollmentId, paymentProofUrl, paymentReference } = data

  // Update enrollment with payment proof
  const { error: updateError } = await supabase
    .from('enrollments')
    .update({
      payment_proof_url: paymentProofUrl,
      payment_reference: paymentReference,
      status: 'pending_review',
      updated_at: new Date().toISOString()
    })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to update enrollment: ${updateError.message}`)
  }

  // Get enrollment details for notification
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('user_id, course_id')
    .eq('id', enrollmentId)
    .single()

  if (enrollment) {
    // Notify user
    await createNotification(enrollment.user_id, 'payment_proof_uploaded', {
      enrollment_id: enrollmentId,
      message: 'Your payment proof has been uploaded and is pending review.',
      title: 'Payment Proof Uploaded'
    })

    // Notify admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins) {
      for (const admin of admins) {
        await createNotification(admin.id, 'payment_review_required', {
          enrollment_id: enrollmentId,
          message: 'A new payment proof requires admin review.',
          title: 'Payment Review Required'
        })
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function adminReview(enrollmentId: string, adminId: string, data: AdminReviewData) {
  const { status } = data

  // Update enrollment status
  const { error: updateError } = await supabase
    .from('enrollments')
    .update({
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to update enrollment: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function approveEnrollment(enrollmentId: string, adminId: string, data: ApproveEnrollmentData) {
  const { notes } = data

  // Update enrollment status
  const { error: updateError } = await supabase
    .from('enrollments')
    .update({
      status: 'payment_approved',
      admin_notes: notes,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to approve enrollment: ${updateError.message}`)
  }

  // Get enrollment details
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('user_id, course_id')
    .eq('id', enrollmentId)
    .single()

  if (enrollment) {
    // Create user_subjects record for approved enrollment
    await supabase
      .from('user_subjects')
      .insert({
        user_id: enrollment.user_id,
        subject_id: enrollment.course_id,
        created_at: new Date().toISOString()
      })

    // Update enrollment to active
    await supabase
      .from('enrollments')
      .update({
        status: 'enrollment_active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId)

    // Notify user
    await createNotification(enrollment.user_id, 'enrollment_approved', {
      enrollment_id: enrollmentId,
      message: 'Your enrollment has been approved! You can now access the course.',
      title: 'Enrollment Approved'
    })
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function rejectEnrollment(enrollmentId: string, adminId: string, data: RejectEnrollmentData) {
  const { notes } = data

  // Update enrollment status
  const { error: updateError } = await supabase
    .from('enrollments')
    .update({
      status: 'payment_rejected',
      admin_notes: notes,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', enrollmentId)

  if (updateError) {
    throw new Error(`Failed to reject enrollment: ${updateError.message}`)
  }

  // Get enrollment details
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('id', enrollmentId)
    .single()

  if (enrollment) {
    // Notify user
    await createNotification(enrollment.user_id, 'enrollment_rejected', {
      enrollment_id: enrollmentId,
      message: 'Your enrollment has been rejected. Please check the admin notes and resubmit if necessary.',
      title: 'Enrollment Rejected'
    })
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function sendReminder(enrollmentId: string) {
  // Get enrollment details
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('user_id, status, created_at')
    .eq('id', enrollmentId)
    .single()

  if (!enrollment) {
    throw new Error('Enrollment not found')
  }

  let message = ''
  let title = ''

  switch (enrollment.status) {
    case 'pending_payment':
      message = 'Don\'t forget to upload your payment proof to complete your enrollment.'
      title = 'Payment Proof Required'
      break
    case 'pending_review':
      message = 'Your payment proof is still under review. We\'ll notify you once it\'s processed.'
      title = 'Payment Under Review'
      break
    case 'payment_rejected':
      message = 'Please resubmit your payment proof to continue with your enrollment.'
      title = 'Resubmission Required'
      break
    default:
      return new Response(
        JSON.stringify({ success: false, message: 'No reminder needed for this status' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
  }

  await createNotification(enrollment.user_id, 'reminder', {
    enrollment_id: enrollmentId,
    message,
    title
  })

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createNotification(userId: string, type: string, data: NotificationData) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title: data.title,
      message: data.message,
      data: data,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}
