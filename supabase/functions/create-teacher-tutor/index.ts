import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface CreateUserRequest {
  email: string
  fullName: string
  role: 'teacher' | 'tutor'
}

// Generate a random password
const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

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

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Initialize regular Supabase client to verify the calling user
    const supabase = createClient(SUPABASE_URL!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CreateUserRequest = await req.json()
    const { email, fullName, role } = body

    // Validate required fields
    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    if (!['teacher', 'tutor'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be teacher or tutor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword()

    // Create user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed: No user returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the profile with correct tenant (trigger creates it with default tenant)
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        tenant_id: userRole.tenant_id,
        learner_category: null // Teachers/tutors don't have a specific learner category
      })
      .eq('id', authData.user.id)

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError)
      // Clean up the auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to update profile: ${profileUpdateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the user role (trigger creates them as 'student', we need to change to teacher/tutor)
    const { error: roleUpdateError } = await supabaseAdmin
      .from('user_roles')
      .update({
        role: role,
        tenant_id: userRole.tenant_id
      })
      .eq('user_id', authData.user.id)

    if (roleUpdateError) {
      console.error('Role update error:', roleUpdateError)
      // Clean up the auth user if role update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to update user role: ${roleUpdateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tenant name for email
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', userRole.tenant_id)
      .single()

    const tenantName = tenantData?.name || 'Rise Up Academy'

    // Send onboarding email - try custom email first, fallback to Supabase reset email
    let emailSent = false
    let emailError: string | null = null
    let usePasswordReset = false
    
    // Try to send custom branded email if RESEND_API_KEY is available
    if (RESEND_API_KEY) {
      try {
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
          </div>
        `

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

        if (emailResponse.ok) {
          emailSent = true
          console.log('Custom email sent successfully to:', email)
        } else {
          const errorText = await emailResponse.text()
          console.error('Custom email sending failed:', errorText)
          console.log('Falling back to Supabase password reset email')
          usePasswordReset = true
        }
      } catch (emailSendError) {
        console.error('Custom email sending error:', emailSendError)
        console.log('Falling back to Supabase password reset email')
        usePasswordReset = true
      }
    } else {
      console.warn('RESEND_API_KEY not configured - using Supabase password reset email')
      usePasswordReset = true
    }

    // Fallback: Use Supabase's built-in password reset email
    if (usePasswordReset && !emailSent) {
      try {
        const origin = req.headers.get('origin') || `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`
        const resetUrl = `${origin}/reset-password`
        
        console.log('Sending password reset email to:', email, 'with redirect:', resetUrl)
        
        // Use resetPasswordForEmail which actually sends the email
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: resetUrl
        })

        if (resetError) {
          console.error('Password reset email error:', resetError)
          emailError = `Failed to send welcome email: ${resetError.message}`
        } else {
          emailSent = true
          console.log('Password reset email sent successfully to:', email)
        }
      } catch (resetEmailError) {
        console.error('Password reset email exception:', resetEmailError)
        emailError = `Failed to send welcome email: ${resetEmailError.message}`
      }
    }

    // Log the creation
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'user_creation',
        description: `Created ${role} account for ${fullName} (${email})`,
        metadata: {
          created_user_id: authData.user.id,
          email_sent: emailSent
        }
      })

    // Construct user-friendly message
    const roleTitle = role === 'teacher' ? 'Teacher' : 'Tutor'
    let statusMessage = `${roleTitle} created successfully`
    
    if (emailSent) {
      if (usePasswordReset) {
        statusMessage += ' and password reset email sent (please check email to set password)'
      } else {
        statusMessage += ' and welcome email sent with login details'
      }
    } else if (emailError) {
      statusMessage += ` but email failed: ${emailError}`
    } else {
      statusMessage += ' but email not configured'
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        email_sent: emailSent,
        email_error: emailError,
        temporary_password: usePasswordReset ? null : temporaryPassword, // Don't return password if using reset flow
        message: statusMessage,
        use_password_reset: usePasswordReset
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-teacher-tutor function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
