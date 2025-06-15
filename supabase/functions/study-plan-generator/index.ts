
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.')
    }
    
    const { goal, timeframe, hours_per_week } = await req.json()

    if (!goal || !timeframe || !hours_per_week) {
      return new Response(JSON.stringify({ error: 'Missing required fields: goal, timeframe, and hours_per_week are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const fullPrompt = `You are an expert study planner. Your task is to create a detailed, actionable study plan based on the user's goal.
    
**Instructions for the plan:**
- Break it down into weekly and daily tasks.
- Provide specific topics to cover.
- Recommend resources if applicable (e.g., websites, concepts to master).
- Suggest a clear, easy-to-follow schedule.
- Structure the entire plan in Markdown format for readability.

**User's Goal and Constraints:**
- **Goal:** "${goal}"
- **Timeframe:** ${timeframe}
- **Study hours per week:** ${hours_per_week}

Please generate the study plan now.`

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }]
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Google Gemini API error:', errorBody)
      throw new Error(`Google Gemini API request failed with status ${response.status}: ${errorBody}`)
    }

    const completion = await response.json()
    
    if (!completion.candidates || completion.candidates.length === 0 || !completion.candidates[0].content?.parts[0]?.text) {
        console.error('Invalid response structure from Gemini API:', completion);
        throw new Error('Failed to parse plan from Gemini API response.');
    }
      
    const planContent = completion.candidates[0].content.parts[0].text

    return new Response(JSON.stringify({ plan: planContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

