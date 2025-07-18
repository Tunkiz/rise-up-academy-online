# Email Setup Guide

## Setting up Email Service for Teacher/Tutor Onboarding

The application uses Resend (https://resend.com) to send onboarding emails to newly created teachers and tutors.

### Step 1: Create a Resend Account

1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Once logged in, go to the API Keys section
2. Click "Create API Key"
3. Give it a name like "Rise Up Academy"
4. Copy the API key (it starts with `re_`)

### Step 3: Configure the API Key in Supabase

Run this command in your terminal to set the API key:

```bash
supabase secrets set RESEND_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the actual API key from Resend.

### Step 4: Verify Domain (Optional for Production)

For production use, you should verify your domain with Resend:

1. In Resend dashboard, go to Domains
2. Add your domain (e.g., riseupacademy.com)
3. Follow the DNS verification steps
4. Update the `from` field in the email function to use your verified domain

### Step 5: Test Email Sending

1. Try creating a new teacher or tutor through the admin panel
2. Check that the email is sent successfully
3. If there are issues, check the Supabase function logs

### Troubleshooting

- **Free tier limits**: Resend free tier allows 100 emails per day
- **Domain verification**: Without domain verification, emails go to a shared domain
- **Delivery issues**: Check spam folders, verify email addresses are correct
- **API errors**: Check the Supabase function logs for detailed error messages

### Email Template Customization

The email template is defined in:
- `/supabase/functions/create-teacher-tutor/index.ts`

You can customize the HTML template to match your branding.
