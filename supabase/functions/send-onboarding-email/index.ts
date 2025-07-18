import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

interface OnboardingEmailRequest {
  email: string
  fullName: string
  role: 'teacher' | 'tutor'
  temporaryPassword: string
  tenantName: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: OnboardingEmailRequest = await req.json()
    const { email, fullName, role, temporaryPassword, tenantName } = body

    // Validate required fields
    if (!email || !fullName || !role || !temporaryPassword || !tenantName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare email content
    const roleTitle = role === 'teacher' ? 'Teacher' : 'Tutor'
    const loginUrl = `${req.headers.get('origin')}/login`
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Welcome to Rise Up Academy Online!</h2>
        
        <p>Hello ${fullName},</p>
        
        <p>You have been invited to join Rise Up Academy Online as a ${roleTitle} for <strong>${tenantName}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Your Login Details:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 4px;">${temporaryPassword}</code></p>
          <p><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a></p>
        </div>
        
        <p><strong>Important:</strong> Please change your password immediately after your first login for security purposes.</p>
        
        <p>As a ${roleTitle}, you will have access to:</p>
        <ul>
          <li>Manage your students and their progress</li>
          <li>Create and organize learning resources</li>
          <li>Monitor student performance and engagement</li>
          <li>Generate study plans and assignments</li>
        </ul>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>
        Rise Up Academy Online Team</p>
        
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This email was sent from Rise Up Academy Online. If you received this email in error, please disregard it.
        </p>
      </div>
    `

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rise Up Academy <noreply@riseupacademy.com>',
        to: [email],
        subject: `Welcome to Rise Up Academy Online - ${roleTitle} Account Created`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Email sending failed:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailData = await emailResponse.json()
    console.log('Email sent successfully:', emailData)

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-onboarding-email function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
