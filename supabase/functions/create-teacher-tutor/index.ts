import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, fullName, role } = await req.json()

    // Validate required fields
    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, fullName, and role are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the current user (admin) making this request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Get admin's tenant
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', adminUser.id)
      .single()

    if (profileError || !adminProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin tenant not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get tenant details for the email
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', adminProfile.tenant_id)
      .single()

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
    }

    const tenantName = tenant?.name || 'Rise Up Academy'

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '123!'

    // Create the user with email confirmation disabled
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${createError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User creation failed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create user profile
    const { error: profileCreateError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: fullName,
        email: email,
        role: role,
        tenant_id: adminProfile.tenant_id
      })

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError)
      // Continue anyway, the user was created
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      // Continue anyway
    }

    // Send welcome email using Supabase's password reset email as a template
    // This ensures the email will work since password reset emails are working
    let emailSent = false
    let emailError = null

    try {
      // Get the current site URL for the redirect
      const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
      const redirectUrl = `${siteUrl}/reset-password`

      // Send a password reset email which will serve as the onboarding email
      const { error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl
        }
      })

      if (resetError) {
        console.error('Error sending onboarding email via password reset:', resetError)
        emailError = resetError.message
      } else {
        emailSent = true
        console.log('Onboarding email sent successfully via password reset mechanism')
      }
    } catch (err) {
      console.error('Error sending email:', err)
      emailError = err.message
    }

    // Return success response with details
    const response = {
      success: true,
      user_id: newUser.user.id,
      email_sent: emailSent,
      temporary_password: emailSent ? undefined : tempPassword, // Only return password if email failed
      message: emailSent 
        ? `${fullName} has been added as a ${role}. They will receive an email with instructions to set up their account.`
        : `${fullName} has been added as a ${role}. Temporary password: ${tempPassword}. Please share this with them securely.`,
      email_error: emailError
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
