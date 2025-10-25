import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface AlertRequest {
  userId: string;
  userEmail: string;
  alertType: 'pollution' | 'weather' | 'climate';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  location: string;
  data: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, userEmail, alertType, severity, title, message, location, data }: AlertRequest = await req.json();

    console.log(`Sending ${severity} ${alertType} alert to ${userEmail}`);

    // Use EnviroAI to generate detailed alert summary
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const aiPrompt = `Generate a detailed but concise email summary for this environmental alert:

Alert Type: ${alertType}
Severity: ${severity}
Location: ${location}
Title: ${title}
Message: ${message}
Data: ${JSON.stringify(data)}

Create a friendly, informative summary (2-3 paragraphs) that:
1. Explains the environmental condition clearly
2. Provides specific health or safety recommendations
3. Suggests timing adjustments for outdoor activities

Keep it conversational and helpful. Sign it as "EnviroAI, your environmental companion"`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://enviroagent.app',
        'X-Title': 'EnviroAgent',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick:free',
        messages: [
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();
    const emailBody = aiData.choices[0].message.content;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: 'EnviroAgent <alerts@enviroagent.app>',
      to: [userEmail],
      subject: `🌍 ${severity.toUpperCase()}: ${title}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2D8659 0%, #1E88E5 100%); padding: 30px; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .alert-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
              .urgent { background: #ef4444; color: white; }
              .high { background: #f97316; color: white; }
              .medium { background: #eab308; color: white; }
              .low { background: #22c55e; color: white; }
              .location { color: #666; font-size: 14px; margin-bottom: 20px; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🌍 EnviroAgent Alert</h1>
              </div>
              <div class="content">
                <div class="alert-badge ${severity}">${severity.toUpperCase()} PRIORITY</div>
                <h2>${title}</h2>
                <div class="location">📍 ${location}</div>
                <div style="white-space: pre-line; margin: 20px 0;">
                  ${emailBody}
                </div>
              </div>
              <div class="footer">
                <p>This alert was sent by EnviroAgent based on your location and habits.</p>
                <p>Powered by EnviroAI • <a href="https://enviroagent.app">enviroagent.app</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResult.error) {
      console.error('Email sending error:', emailResult.error);
      throw emailResult.error;
    }

    console.log('Email sent successfully:', emailResult.data);

    // Store notification in database
    const { error: notifError } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        notification_type: `${alertType}_alert`,
        title,
        body: message,
        data: {
          severity,
          location,
          ...data
        }
      });

    if (notifError) {
      console.error('Failed to store notification:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        emailId: emailResult.data?.id,
        message: 'Alert sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-environmental-alerts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
