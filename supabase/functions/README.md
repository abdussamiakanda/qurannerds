# Supabase Edge Functions

## Email Notifications Function

This edge function handles sending email notifications for:
- **New Notes**: Sends email to all registered users when a new note is published
- **New Comments**: Sends email to the note author and all users who have commented on the note

### Setup via Supabase Dashboard

1. **Create the Edge Function**:
   - Go to your Supabase project dashboard
   - Navigate to **Edge Functions** in the left sidebar
   - Click **Create a new function**
   - Name it `send-email`

2. **Upload the Function Code**:
   - Copy the contents of `supabase/functions/send-email/index.ts`
   - Paste it into the function editor in the Supabase dashboard
   - Save the function

3. **Set Environment Variables**:
   - In the Edge Functions section, go to **Settings** → **Secrets** (or **Environment Variables**)
   - Click **Add new secret**
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)
   - Click **Save**
   
   **Important**: Make sure the secret name is exactly `RESEND_API_KEY` (case-sensitive)
   
   The following are automatically provided by Supabase:
   - `SUPABASE_URL` - Automatically available
   - `SUPABASE_SERVICE_ROLE_KEY` - Automatically available

### Getting Your Resend API Key

1. Sign up for a free account at [Resend](https://resend.com/) (3,000 emails/month free!)
2. Go to **API Keys** in your dashboard
3. Click **Create API Key**
4. Copy your API key (starts with `re_`)
5. Add it as `RESEND_API_KEY` in Supabase Edge Functions secrets

### Resend Free Tier

- ✅ **3,000 emails per month** (100 per day)
- ✅ **No domain required** - Use `onboarding@resend.dev` for free
- ✅ **Professional email service**
- ✅ **Easy to upgrade** when you get a domain

### Environment Variables Required

- `RESEND_API_KEY`: Your Resend API key for sending emails

### Usage

The function is automatically called from:
- `CreatePost.jsx` - After a new note is created
- `Comments.jsx` - After a new comment is added

### Email Configuration

The function uses `onboarding@resend.dev` by default (no domain needed). 

If you get your own domain later, you can update the sender email in the edge function:
```typescript
from: 'QuranNerds <noreply@yourdomain.com>',
```

Then verify your domain in Resend dashboard.

