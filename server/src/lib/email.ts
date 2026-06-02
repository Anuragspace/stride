import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface InviteMailData {
  email: string;
  workspaceName: string;
  senderName: string;
  inviteLink: string;
}

export async function sendWorkspaceInviteEmail({
  email,
  workspaceName,
  senderName,
  inviteLink,
}: InviteMailData): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'invites@stride.com';
  const senderNameConfig = process.env.BREVO_SENDER_NAME || 'Stride';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>You have been invited to join Stride</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0c0e;
            color: #e4e6eb;
            margin: 0;
            padding: 40px 20px;
          }
          .card {
            max-width: 500px;
            margin: 0 auto;
            background-color: #121316;
            border: 1px solid #282a2f;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          }
          h1 {
            font-size: 22px;
            font-weight: 600;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #b0b3b8;
            margin-bottom: 24px;
          }
          .button {
            display: inline-block;
            background-color: #ffffff;
            color: #0b0c0e !important;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            padding: 10px 24px;
            border-radius: 6px;
            margin-bottom: 24px;
          }
          .footer {
            font-size: 12px;
            color: #65676b;
            border-top: 1px solid #282a2f;
            padding-top: 16px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>You've been invited to join Stride</h1>
          <p>Hi,</p>
          <p><strong>${senderName}</strong> has invited you to join the collaborative workspace <strong>${workspaceName}</strong> on Stride.</p>
          <a href="${inviteLink}" class="button">Accept Invitation & Join</a>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #0099ff;">${inviteLink}</p>
          <div class="footer">
            This invitation was sent by Stride on behalf of ${senderName}.
          </div>
        </div>
      </body>
    </html>
  `;

  if (!apiKey) {
    console.log(`
    ┌────────────────────────────────────────────────────────┐
    │ 📨 [Dev Fallback] Transactional Email Simulated        │
    ├────────────────────────────────────────────────────────┤
    │ To:      ${email}                                       │
    │ Subject: Invitation to join "${workspaceName}"        │
    │ Sender:  ${senderName}                                  │
    │ Link:    ${inviteLink}                                  │
    └────────────────────────────────────────────────────────┘
    `);
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderNameConfig, email: senderEmail },
        to: [{ email }],
        subject: `${senderName} invited you to join "${workspaceName}" on Stride`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Email Error] Brevo API returned status ${response.status}:`, errText);
      throw new Error(`Email dispatch failed: ${errText}`);
    }

    console.log(`[Email Success] Invitation email successfully sent to ${email} via Brevo!`);
  } catch (error) {
    console.error('[Email Error] Failed to send email via Brevo:', error);
    throw error;
  }
}
