
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const system_prompt = `You are Edu, a friendly and encouraging AI tutor for students.
- Your main goal is to help students understand concepts, not just give them the answers.
- Explain topics clearly and simply, using analogies and examples where helpful.
- If a student asks for the answer to a question (e.g., from a test), guide them through the steps to solve it themselves instead of providing the direct answer.
- If you don't know something, it's better to say "I'm not sure about that" than to make something up.
- Keep your tone positive and supportive.
- Format your responses using markdown for better readability (e.g., use lists, bold text, etc.).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { history } = await req.json();

    const requestBody = {
      contents: [
        ...history.map((turn: { role: string; parts: { text: string }[] }) => ({
          role: turn.role,
          parts: turn.parts,
        })),
      ],
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: system_prompt,
          },
        ],
      },
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const botMessage = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ reply: botMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-tutor function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
