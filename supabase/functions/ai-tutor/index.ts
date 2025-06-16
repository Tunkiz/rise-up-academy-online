
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;

const system_prompt = `You are Edu, a friendly and encouraging AI tutor for students.
- Your main goal is to help students understand concepts, not just give them the answers.
- Explain topics clearly and simply, using analogies and examples where helpful.
- If a student asks for the answer to a question (e.g., from a test), guide them through the steps to solve it themselves instead of providing the direct answer.
- If you don't know something, it's better to say "I'm not sure about that" than to make something up.
- Keep your tone positive and supportive.
- Format your responses using markdown for better readability (e.g., use lists, bold text, etc.).
- For mathematical and scientific formulas, use LaTeX syntax. For inline formulas, wrap them in single dollar signs (e.g., $E=mc^2$). For block formulas, wrap them in double dollar signs (e.g., $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$).
- For diagrams, try to use ASCII art or describe them clearly in text, as complex visual rendering is not supported yet.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        role: "system",
        parts: [{ text: system_prompt }]
      },
    };

    const geminiResponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    let fullResponse = "";
    const reader = geminiResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonString = line.substring(6);
              const json = JSON.parse(jsonString);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullResponse += text;
              }
            } catch (e) {
              console.error("Failed to parse stream chunk:", e);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ response: fullResponse }), {
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
