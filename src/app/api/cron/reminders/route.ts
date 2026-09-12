import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import twilio from 'twilio'

// This route is called by a cron job (e.g., Vercel Cron or external scheduler)
// It should be protected by a secret to prevent unauthorized calls.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM?.trim()

  const missingEnvVars: string[] = []
  if (!cronSecret || cronSecret === 'your-random-cron-secret-key') missingEnvVars.push('CRON_SECRET')
  if (!twilioAccountSid || twilioAccountSid === 'your-twilio-account-sid') missingEnvVars.push('TWILIO_ACCOUNT_SID')
  if (!twilioAuthToken || twilioAuthToken === 'your-twilio-auth-token') missingEnvVars.push('TWILIO_AUTH_TOKEN')
  if (!twilioWhatsAppFrom || twilioWhatsAppFrom === 'whatsapp:+14155238886') missingEnvVars.push('TWILIO_WHATSAPP_FROM')

  if (missingEnvVars.length > 0) {
    return NextResponse.json({
      error: 'WhatsApp reminder is not configured. Set valid values for: ' + missingEnvVars.join(', ') + '. Update .env.local and restart the app.',
    }, { status: 500 })
  }

  // Authenticate the cron request
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${cronSecret}`

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized. Include the correct Bearer token from CRON_SECRET.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const twilioClient = twilio(twilioAccountSid, twilioAuthToken)

  const now = new Date()

  // Find tasks where:
  // 1. Not completed
  // 2. Not already notified
  // 3. Deadline is in the future
  // 4. Current time is >= (deadline - reminder_minutes_before)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      deadline,
      reminder_minutes_before,
      user_id
    `)
    .eq('is_completed', false)
    .eq('notification_sent', false)
    .gt('deadline', now.toISOString())

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ message: 'No tasks to notify', notified: 0 })
  }

  // Filter tasks that are within their reminder window
  const tasksToNotify = tasks.filter((task) => {
    const deadlineMs = new Date(task.deadline).getTime()
    const reminderMs = task.reminder_minutes_before * 60 * 1000
    const triggerTime = deadlineMs - reminderMs
    return now.getTime() >= triggerTime
  })

  if (tasksToNotify.length === 0) {
    return NextResponse.json({ message: 'No tasks due for notification yet', notified: 0 })
  }

  // Get user IDs to fetch WhatsApp numbers
  const userIds = [...new Set(tasksToNotify.map((t) => t.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, whatsapp_number, full_name')
    .in('id', userIds)
    .not('whatsapp_number', 'is', null)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  const results: { taskId: string; status: string; error?: string }[] = []

  for (const task of tasksToNotify) {
    const profile = profileMap.get(task.user_id)

    if (!profile?.whatsapp_number) {
      // No WhatsApp number configured — still mark as sent to avoid future retries
      await supabase.from('tasks').update({ notification_sent: true }).eq('id', task.id)
      results.push({ taskId: task.id, status: 'skipped_no_number' })
      continue
    }

    const deadlineDate = new Date(task.deadline)
    const hoursLeft = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const minutesLeft = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60))
    const timeText = hoursLeft >= 1 ? `${hoursLeft} hour(s)` : `${minutesLeft} minute(s)`

    const messageBody = [
      `⚡ *Tasker Reminder*`,
      ``,
      `Hi ${profile.full_name ?? 'there'}! 👋`,
      ``,
      `Your task is due soon:`,
      `📋 *${task.title}*`,
      `⏰ Due: ${deadlineDate.toLocaleString()}`,
      `🕐 Time left: ~${timeText}`,
      ``,
      `Don't forget to complete it on time! 💪`,
    ].join('\n')

    try {
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM!,
        to: `whatsapp:${profile.whatsapp_number}`,
        body: messageBody,
      })

      // Mark task as notified
      await supabase
        .from('tasks')
        .update({ notification_sent: true })
        .eq('id', task.id)

      results.push({ taskId: task.id, status: 'sent' })
    } catch (err: unknown) {
      console.error(`Failed to send WhatsApp for task ${task.id}:`, err)
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ taskId: task.id, status: 'failed', error: errMsg })
    }
  }

  const sent = results.filter((r) => r.status === 'sent').length
  const failed = results.filter((r) => r.status === 'failed').length

  return NextResponse.json({
    message: `Processed ${tasksToNotify.length} task(s). Sent: ${sent}, Failed: ${failed}`,
    notified: sent,
    results,
  })
}
