
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const PPLX_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
const PPLX_API_URL = 'https://api.perplexity.ai/chat/completions'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!PPLX_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not set in environment variables.')
    }
    
    const { goal, timeframe, hours_per_week } = await req.json()

    if (!goal || !timeframe || !hours_per_week) {
      return new Response(JSON.stringify({ error: 'Missing required fields: goal, timeframe, and hours_per_week are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const systemPrompt = `You are an expert study planner. Create a detailed, actionable study plan based on the user's goal. Break it down into weekly and daily tasks. Provide specific topics to cover, recommended resources (if applicable, like websites or concepts), and suggest a schedule. The plan should be structured in Markdown format for readability and be easy to follow.`

    const userPrompt = `My goal is: "${goal}". I have ${timeframe} to prepare, and I can study for ${hours_per_week} hours per week. Please generate a study plan for me.`

    const response = await fetch(PPLX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PPLX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Perplexity API error:', errorBody)
      throw new Error(`Perplexity API request failed with status ${response.status}`)
    }

    const completion = await response.json()
    const planContent = completion.choices[0].message.content

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
