// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailRequest {
  type: 'note' | 'comment'
  noteId?: string
  noteTitle?: string
  noteAuthorName?: string
  commentAuthorName?: string
  commentContent?: string
  noteSlug?: string
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      })
    }

    const body = await req.json()

    const { type, noteId, noteTitle, noteAuthorName, commentAuthorName, commentContent, noteSlug }: EmailRequest = body

    if (!type) {
      return new Response(
        JSON.stringify({ error: 'Type is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let recipients: string[] = []
    let subject = ''
    let html = ''

    if (type === 'note') {
      // Get all unique author emails from posts table (users who have created notes)
      const postsResponse = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=author_email`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      })

      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        const posts = Array.isArray(postsData) ? postsData : []
        recipients = [...new Set(posts
          .map((post: { author_email: string }) => post.author_email)
          .filter((email: string) => email && email.trim() !== ''))]
      }
      
      // Also get emails from profiles table to include all registered users
      const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=email`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      })

      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json()
        const profiles = Array.isArray(profilesData) ? profilesData : []
        const profileEmails = profiles
          .map((profile: { email: string }) => profile.email)
          .filter((email: string) => email && email.trim() !== '')
        // Merge and deduplicate
        recipients = [...new Set([...recipients, ...profileEmails])]
      }

      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No recipients found' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Construct the frontend URL
      const noteUrl = noteSlug ? `https://qurannerds.netlify.app/note/${noteSlug}` : '#'

      
      subject = `New Note: ${noteTitle || 'Untitled'}`
      html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Note Published - QuranNerds</title>
  <style>
    body, table, td, p, a {
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 100%;
      font: inherit;
      vertical-align: baseline;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f8f9fa;
      color: rgba(0, 0, 0, 0.84);
      line-height: 1.58;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      padding: 40px 40px 30px;
      text-align: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    .email-logo {
      font-size: 28px;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.84);
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      font-family: 'Georgia', 'Times New Roman', serif;
    }
    .email-tagline {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.64);
      margin-top: 5px;
    }
    .email-body {
      padding: 40px;
    }
    .email-title {
      font-size: 24px;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.84);
      margin-bottom: 20px;
      line-height: 1.3;
    }
    .email-text {
      font-size: 16px;
      color: rgba(0, 0, 0, 0.84);
      margin-bottom: 30px;
      line-height: 1.58;
    }
    .email-button {
      display: inline-block;
      padding: 12px 32px;
      background-color: #000000;
      color: #ffffff;
      text-decoration: none;
      border-radius: 99em;
      font-size: 16px;
      font-weight: 400;
      text-align: center;
      margin: 20px 0;
    }
    .email-note-box {
      padding: 20px;
      background-color: #f8f9fa;
      border-left: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      margin: 30px 0;
    }
    .email-note-title {
      font-size: 18px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.84);
      margin: 0 0 10px 0;
    }
    .email-footer {
      padding: 30px 40px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      text-align: center;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.48);
    }
    .email-footer-text {
      margin-bottom: 10px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .email-header,
      .email-body,
      .email-footer {
        padding: 30px 20px !important;
      }
      .email-title {
        font-size: 22px !important;
      }
      .email-text {
        font-size: 15px !important;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table class="email-container" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td class="email-header">
              <div class="email-logo">QuranNerds</div>
              <div class="email-tagline">Share your Quran study insights</div>
            </td>
          </tr>
          <tr>
            <td class="email-body">
              <h2 class="email-title">New Note Published</h2>
              <p class="email-text">
                ${noteAuthorName || 'A community member'} has published a new note on QuranNerds:
              </p>
              <div class="email-note-box">
                <h3 class="email-note-title">${noteTitle || 'Untitled'}</h3>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${noteUrl}" class="email-button">Read Note</a>
              </div>
              <p class="email-text" style="font-size: 14px; color: rgba(0, 0, 0, 0.64);">
                You're receiving this because you're a member of QuranNerds.
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-footer">
              <p class="email-footer-text">
                <strong>QuranNerds</strong><br>
                A platform for sharing Quran study insights
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    } else if (type === 'comment') {
      if (!noteId) {
        return new Response(
          JSON.stringify({ error: 'noteId is required for comment notifications' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Get note author email
      const noteResponse = await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${noteId}&select=author_email,title`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      })

      if (!noteResponse.ok) {
        throw new Error('Failed to fetch note')
      }

      const notesData = await noteResponse.json()
      const notes = Array.isArray(notesData) ? notesData : []
      if (notes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Note not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const note = notes[0]
      const noteAuthorEmail = note.author_email

      // Get all unique commenter emails from comments table
      const commentsResponse = await fetch(`${SUPABASE_URL}/rest/v1/comments?post_id=eq.${noteId}&select=user_id,author_email`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      })

      let comments: any[] = []
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        // Ensure comments is an array
        comments = Array.isArray(commentsData) ? commentsData : []
      }
      
      // Extract emails from commenters
      let commenterEmails: string[] = []
      
      // Get emails from comments if they have author_email
      if (Array.isArray(comments) && comments.length > 0) {
        const emailsFromComments = comments
          .map((c: { author_email?: string }) => c.author_email)
          .filter((email: string | undefined) => email && email.trim() !== '')
        commenterEmails = [...emailsFromComments]
        
        // Get emails from posts table for commenters who have created posts
        const commenterUserIds = [...new Set(comments.map((c: { user_id: string }) => c.user_id).filter(Boolean))]
        
        if (commenterUserIds.length > 0) {
          // Get emails from posts where author_id matches commenter user_ids
          const userIdsParam = commenterUserIds.join(',')
          const postsResponse = await fetch(`${SUPABASE_URL}/rest/v1/posts?author_id=in.(${userIdsParam})&select=author_email`, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          })

          if (postsResponse.ok) {
            const postsData = await postsResponse.json()
            const posts = Array.isArray(postsData) ? postsData : []
            const emailsFromPosts = posts
              .map((post: { author_email: string }) => post.author_email)
              .filter((email: string) => email && email.trim() !== '')
            commenterEmails = [...new Set([...commenterEmails, ...emailsFromPosts])]
          }
        }
      }

      // Combine note author and commenters, remove duplicates
      recipients = [...new Set([noteAuthorEmail, ...commenterEmails])]
        .filter((email: string) => email && email.trim() !== '')

      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No recipients found' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Construct the frontend URL
      const noteUrl = noteSlug ? `https://qurannerds.netlify.app/note/${noteSlug}` : '#'
      
      subject = `New Comment on: ${note.title || 'Untitled'}`
      html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Comment - QuranNerds</title>
  <style>
    body, table, td, p, a {
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 100%;
      font: inherit;
      vertical-align: baseline;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f8f9fa;
      color: rgba(0, 0, 0, 0.84);
      line-height: 1.58;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      padding: 40px 40px 30px;
      text-align: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    .email-logo {
      font-size: 28px;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.84);
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      font-family: 'Georgia', 'Times New Roman', serif;
    }
    .email-tagline {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.64);
      margin-top: 5px;
    }
    .email-body {
      padding: 40px;
    }
    .email-title {
      font-size: 24px;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.84);
      margin-bottom: 20px;
      line-height: 1.3;
    }
    .email-text {
      font-size: 16px;
      color: rgba(0, 0, 0, 0.84);
      margin-bottom: 30px;
      line-height: 1.58;
    }
    .email-button {
      display: inline-block;
      padding: 12px 32px;
      background-color: #000000;
      color: #ffffff;
      text-decoration: none;
      border-radius: 99em;
      font-size: 16px;
      font-weight: 400;
      text-align: center;
      margin: 20px 0;
    }
    .email-note-box {
      padding: 20px;
      background-color: #f8f9fa;
      border-left: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      margin: 30px 0;
    }
    .email-note-title {
      font-size: 18px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.84);
      margin: 0 0 10px 0;
    }
    .email-comment-box {
      padding: 16px;
      background-color: #f8f9fa;
      border-left: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      margin: 20px 0;
    }
    .email-comment-text {
      font-size: 15px;
      color: rgba(0, 0, 0, 0.84);
      line-height: 1.6;
      margin: 0;
      font-style: italic;
    }
    .email-footer {
      padding: 30px 40px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      text-align: center;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.48);
    }
    .email-footer-text {
      margin-bottom: 10px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .email-header,
      .email-body,
      .email-footer {
        padding: 30px 20px !important;
      }
      .email-title {
        font-size: 22px !important;
      }
      .email-text {
        font-size: 15px !important;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table class="email-container" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td class="email-header">
              <div class="email-logo">QuranNerds</div>
              <div class="email-tagline">Share your Quran study insights</div>
            </td>
          </tr>
          <tr>
            <td class="email-body">
              <h2 class="email-title">New Comment Added</h2>
              <p class="email-text">
                ${commentAuthorName || 'Someone'} commented on the note:
              </p>
              <div class="email-note-box">
                <h3 class="email-note-title">${note.title || 'Untitled'}</h3>
              </div>
              <div class="email-comment-box">
                <p class="email-comment-text">"${commentContent || 'New comment'}"</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${noteUrl}" class="email-button">View Note & Comment</a>
              </div>
              <p class="email-text" style="font-size: 14px; color: rgba(0, 0, 0, 0.64);">
                You're receiving this because you're the author or have commented on this note.
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-footer">
              <p class="email-footer-text">
                <strong>QuranNerds</strong><br>
                A platform for sharing Quran study insights
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "note" or "comment"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Resend API key is not configured. Please set RESEND_API_KEY in Edge Function secrets.',
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Send emails to all recipients using Resend
    const emailPromises = recipients.map(async (to) => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'QuranNerds <onboarding@resend.dev>',
            to: to,
            subject: subject,
            html: html,
          }),
        })

        const data = await res.json()
        return { success: res.ok, email: to, data }
      } catch (error) {
        return { success: false, email: to, error: error.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: recipients.length,
        results 
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error sending emails:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send emails',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
