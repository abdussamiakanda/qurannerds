import emailjs from '@emailjs/browser'

// EmailJS configuration from environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID // For meeting notifications
const EMAILJS_NOTE_COMMENT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_NOTE_COMMENT_TEMPLATE_ID // For note and comment notifications
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://qurannerds.netlify.app'

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY)
}

// Format meeting date and time
function formatMeetingDateTime(dateString, timeString) {
  const date = new Date(dateString)
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
  const formattedDate = date.toLocaleDateString('en-US', options)
  
  if (timeString) {
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    const formattedTime = `${hour12}:${minutes} ${ampm}`
    return `${formattedDate} at ${formattedTime}`
  }
  
  return formattedDate
}

// Send email notification to group members
export async function sendMeetingNotification({
  eventType, // 'created' or 'deleted'
  meeting,
  group,
  members, // Array of member objects with { id, email, name }
}) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.error('EmailJS not configured. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY')
    return { success: false, error: 'EmailJS not configured' }
  }

  const meetingDateTime = formatMeetingDateTime(meeting.meeting_date, meeting.meeting_time)
  const meetingType = meeting.meeting_type === 'online' ? 'Online' : 'Offline'
  const groupUrl = `${SITE_URL}/groups/${group.slug}`

  const subject = eventType === 'created'
    ? `New Session Scheduled: ${meeting.title} - ${group.name}`
    : `Session Cancelled: ${meeting.title} - ${group.name}`

  // Build HTML snippets for optional fields
  const meetingDescriptionHtml = meeting.description
    ? `<div style="color: #7f8c8d; font-size: 14px; margin-bottom: 12px;"><strong>Description:</strong> ${meeting.description}</div>`
    : ''

  const meetingLocationHtml = meeting.location
    ? `<div style="color: #7f8c8d; font-size: 14px; margin-bottom: 12px;"><strong>Location:</strong> ${meeting.location}</div>`
    : ''

  const meetingLinkHtml = meeting.online_link
    ? `<div style="color: #7f8c8d; font-size: 14px; margin-bottom: 12px;"><strong>Meeting Link:</strong> <a href="${meeting.online_link}" style="color: #3498db; text-decoration: none;">${meeting.online_link}</a></div>`
    : ''

  const meetingDurationHtml = meeting.duration_minutes
    ? `<div style="color: #7f8c8d; font-size: 14px; margin-bottom: 12px;"><strong>Duration:</strong> ${meeting.duration_minutes} minutes</div>`
    : ''

  // Prepare template parameters
  const templateParams = {
    title: eventType === 'created' ? 'New Session Scheduled' : 'Session Cancelled',
    intro_message: eventType === 'created' 
      ? `A new study session has been scheduled for ${group.name}.`
      : `A study session for ${group.name} has been cancelled.`,
    meeting_title: meeting.title,
    meeting_datetime: meetingDateTime,
    meeting_type: meetingType,
    group_url: groupUrl,
    group_name: group.name,
    meeting_description_html: meetingDescriptionHtml,
    meeting_location_html: meetingLocationHtml,
    meeting_link_html: meetingLinkHtml,
    meeting_duration_html: meetingDurationHtml,
  }

  // Send emails to all members
  const results = []
  for (const member of members) {
    if (!member.email) {
      console.log(`Skipping user ${member.id} - no email`)
      continue
    }

    try {
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          ...templateParams,
          to_email: member.email,
          subject: subject,
          from_name: 'QuranNerds',
        }
      )

      if (response.status === 200) {
        console.log(`Email sent to ${member.email}`)
        results.push({ email: member.email, success: true })
      } else {
        console.error(`Failed to send email to ${member.email}:`, response)
        results.push({ email: member.email, success: false, error: response.text || 'Unknown error' })
      }
    } catch (error) {
      console.error(`Error sending email to ${member.email}:`, error)
      results.push({ email: member.email, success: false, error: error.text || error.message || 'Unknown error' })
    }
  }

  const successCount = results.filter(r => r.success).length
  return {
    success: successCount > 0,
    sent: successCount,
    total: members.length,
    results
  }
}

// Strip HTML and get excerpt (for email)
function getExcerpt(html, maxLength = 200) {
  if (!html) return ''
  
  // Create a temporary DOM element to parse HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  
  // Get text content and clean up whitespace
  let text = tmp.textContent || tmp.innerText || ''
  
  // Replace multiple whitespaces with single space
  text = text.replace(/\s+/g, ' ').trim()
  
  if (text.length <= maxLength) {
    return text
  }
  
  // Truncate at word boundary
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

// Send email notification when a new note is created
export async function sendNoteCreatedNotification({
  note,
  author, // { id, email, name }
  recipients, // Array of user objects with { id, email, name }
}) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_NOTE_COMMENT_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.error('EmailJS not configured for notes. Please set VITE_EMAILJS_NOTE_COMMENT_TEMPLATE_ID')
    return { success: false, error: 'EmailJS not configured' }
  }

  const noteUrl = `${SITE_URL}/note/${note.slug || note.id}`
  const excerpt = getExcerpt(note.content, 150)
  const excerptHtml = excerpt
    ? `<div style="color: #7f8c8d; font-size: 14px; margin-bottom: 12px; line-height: 1.5;">${excerpt}</div>`
    : ''

  const authorName = author.name || author.email?.split('@')[0] || 'Someone'
  const subject = `New Note: ${note.title} - QuranNerds`

  // Prepare template parameters
  const templateParams = {
    title: 'New Note Published',
    intro_message: `${authorName} just published a new note on QuranNerds.`,
    author_name: authorName,
    note_title: note.title,
    note_excerpt_html: excerptHtml,
    note_url: noteUrl,
    comment_section_html: '', // No comment for new notes
    button_text: 'Read Note',
    footer_message: 'You\'re receiving this email because you\'re a member of the QuranNerds community.',
  }

  // Send emails to all recipients (excluding author)
  const results = []
  for (const recipient of recipients) {
    // Skip if recipient is the author
    if (recipient.id === author.id) {
      continue
    }

    if (!recipient.email) {
      console.log(`Skipping user ${recipient.id} - no email`)
      continue
    }

    try {
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_NOTE_COMMENT_TEMPLATE_ID,
        {
          ...templateParams,
          to_email: recipient.email,
          subject: subject,
          from_name: 'QuranNerds',
        }
      )

      if (response.status === 200) {
        console.log(`Email sent to ${recipient.email}`)
        results.push({ email: recipient.email, success: true })
      } else {
        console.error(`Failed to send email to ${recipient.email}:`, response)
        results.push({ email: recipient.email, success: false, error: response.text || 'Unknown error' })
      }
    } catch (error) {
      console.error(`Error sending email to ${recipient.email}:`, error)
      results.push({ email: recipient.email, success: false, error: error.text || error.message || 'Unknown error' })
    }
  }

  const successCount = results.filter(r => r.success).length
  return {
    success: successCount > 0,
    sent: successCount,
    total: recipients.length,
    results
  }
}

// Send email notification when a comment is added
export async function sendCommentCreatedNotification({
  comment,
  commenter, // { id, email, name }
  note,
  noteAuthor, // { id, email, name } - note author
  recipients, // Array of user objects with { id, email, name } - note author and other commenters
}) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_NOTE_COMMENT_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.error('EmailJS not configured for comments. Please set VITE_EMAILJS_NOTE_COMMENT_TEMPLATE_ID')
    return { success: false, error: 'EmailJS not configured' }
  }

  const noteUrl = `${SITE_URL}/note/${note.slug || note.id}`
  const commenterName = commenter.name || commenter.email?.split('@')[0] || 'Someone'
  const authorName = noteAuthor?.name || noteAuthor?.email?.split('@')[0] || 'Someone'
  
  // Get note excerpt if we have note content
  const noteExcerpt = note.content ? getExcerpt(note.content, 150) : ''
  const noteExcerptHtml = noteExcerpt
    ? `<div style="color: #7f8c8d; font-size: 14px; margin-bottom: 12px; line-height: 1.5;">${noteExcerpt}</div>`
    : ''

  const subject = `${commenterName} commented on "${note.title}"`

  // Build comment section HTML
  const commentSectionHtml = `
    <div
      style="
        margin: 20px 0;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        border-left: 4px solid #3498db;
      "
    >
      <table role="presentation" style="width: 100%;">
        <tr>
          <td style="vertical-align: top; width: 50px;">
            <div
              style="
                padding: 8px 12px;
                margin-right: 15px;
                background-color: #3498db;
                border-radius: 6px;
                font-size: 24px;
                text-align: center;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
              role="img"
            >
              💬
            </div>
          </td>
          <td style="vertical-align: top;">
            <div style="color: #2c3e50; font-size: 16px; font-weight: 600; margin-bottom: 8px;">
              ${commenterName} said:
            </div>
            <div style="color: #34495e; font-size: 14px; line-height: 1.6; padding: 12px; background-color: #f8f9fa; border-radius: 4px;">
              ${comment.content}
            </div>
          </td>
        </tr>
      </table>
    </div>
  `

  // Prepare template parameters
  const templateParams = {
    title: 'New Comment on Note',
    intro_message: `${commenterName} commented on "${note.title}".`,
    author_name: authorName,
    note_title: note.title,
    note_excerpt_html: noteExcerptHtml,
    note_url: noteUrl,
    comment_section_html: commentSectionHtml,
    button_text: 'View Comment',
    footer_message: 'You\'re receiving this email because someone commented on a note you\'re following.',
  }

  // Send emails to all recipients (excluding commenter)
  const results = []
  for (const recipient of recipients) {
    // Skip if recipient is the commenter
    if (recipient.id === commenter.id) {
      continue
    }

    if (!recipient.email) {
      console.log(`Skipping user ${recipient.id} - no email`)
      continue
    }

    try {
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_NOTE_COMMENT_TEMPLATE_ID,
        {
          ...templateParams,
          to_email: recipient.email,
          subject: subject,
          from_name: 'QuranNerds',
        }
      )

      if (response.status === 200) {
        console.log(`Email sent to ${recipient.email}`)
        results.push({ email: recipient.email, success: true })
      } else {
        console.error(`Failed to send email to ${recipient.email}:`, response)
        results.push({ email: recipient.email, success: false, error: response.text || 'Unknown error' })
      }
    } catch (error) {
      console.error(`Error sending email to ${recipient.email}:`, error)
      results.push({ email: recipient.email, success: false, error: error.text || error.message || 'Unknown error' })
    }
  }

  const successCount = results.filter(r => r.success).length
  return {
    success: successCount > 0,
    sent: successCount,
    total: recipients.length,
    results
  }
}
