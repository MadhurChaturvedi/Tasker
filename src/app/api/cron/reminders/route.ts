import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import nodemailer from 'nodemailer'

// This route is called by a cron job (e.g., Vercel Cron or external scheduler)
// It should be protected by a secret to prevent unauthorized calls.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const smtpHost = process.env.SMTP_HOST?.trim()
  const smtpPort = Number(process.env.SMTP_PORT ?? '587')
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim()
  const smtpFrom = process.env.SMTP_FROM?.trim()

  const missingEnvVars: string[] = []
  if (!cronSecret || cronSecret === 'your-random-cron-secret-key') missingEnvVars.push('CRON_SECRET')
  if (!smtpHost) missingEnvVars.push('SMTP_HOST')
  if (!smtpUser) missingEnvVars.push('SMTP_USER')
  if (!smtpPass) missingEnvVars.push('SMTP_PASS')
  if (!smtpFrom) missingEnvVars.push('SMTP_FROM')

  if (missingEnvVars.length > 0) {
    return NextResponse.json({
      error: 'Email reminder is not configured. Set valid values for: ' + missingEnvVars.join(', ') + '. Update .env.local and restart the app.',
    }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${cronSecret}`

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized. Include the correct Bearer token from CRON_SECRET.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const now = new Date()

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

  const tasksToNotify = tasks.filter((task) => {
    const deadlineMs = new Date(task.deadline).getTime()
    const reminderMs = task.reminder_minutes_before * 60 * 1000
    const triggerTime = deadlineMs - reminderMs
    return now.getTime() >= triggerTime
  })

  if (tasksToNotify.length === 0) {
    return NextResponse.json({ message: 'No tasks due for notification yet', notified: 0 })
  }

  const userIds = [...new Set(tasksToNotify.map((t) => t.user_id))]
  const userEmailMap = new Map<string, string>()

  for (const userId of userIds) {
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (!error && data.user?.email) {
      userEmailMap.set(userId, data.user.email)
    }
  }

  const profiles = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  if (profiles.error) {
    console.error('Error fetching profiles:', profiles.error)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  const profileMap = new Map(profiles.data?.map((p) => [p.id, p]) ?? [])

  const results: { taskId: string; status: string; error?: string }[] = []

  for (const task of tasksToNotify) {
    const profile = profileMap.get(task.user_id)
    const recipientEmail = userEmailMap.get(task.user_id)

    if (!recipientEmail) {
      await supabase.from('tasks').update({ notification_sent: true }).eq('id', task.id)
      results.push({ taskId: task.id, status: 'skipped_no_email' })
      continue
    }

    const deadlineDate = new Date(task.deadline)
    const hoursLeft = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const minutesLeft = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60))
    const timeText = hoursLeft >= 1 ? `${hoursLeft} hour(s)` : `${minutesLeft} minute(s)`

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px; color: #4f46e5;">⚡ Tasker Reminder</h2>
        <p>Hello ${profile?.full_name ?? 'there'}!</p>
        <p>Your task is due soon:</p>
        <p><strong>📋 ${task.title}</strong></p>
        <p><strong>⏰ Due:</strong> ${deadlineDate.toLocaleString()}</p>
        <p><strong>🕐 Time left:</strong> ~${timeText}</p>
        <p>Don't forget to complete it on time.</p>
      </div>
    `

    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject: `Task reminder: ${task.title}`,
        html,
        text: `Tasker Reminder\n\nHello ${profile?.full_name ?? 'there'}!\nYour task "${task.title}" is due soon.\nDue: ${deadlineDate.toLocaleString()}\nTime left: ~${timeText}\nDon't forget to complete it on time.`,
      })

      await supabase
        .from('tasks')
        .update({ notification_sent: true })
        .eq('id', task.id)

      results.push({ taskId: task.id, status: 'sent' })
    } catch (err: unknown) {
      console.error(`Failed to send email for task ${task.id}:`, err)
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
