import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const { message, previousMessages, language } = await req.json();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: secret } = await supabase
      .rpc('get_secret', { secret_name: 'OPENAI_API_KEY' });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Jesteś AI Mediator w czacie pary. Odpowiadaj TYLKO gdy widzisz problem lub okazję. Bądź krótki (1-2 zdania). Jeśli nie widzisz problemu, odpowiedz pustym stringiem.' 
          },
          { 
            role: 'user', 
            content: `Ostatnie wiadomości: ${previousMessages?.join('\n') || 'brak'}\n\nNOWA WIADOMOŚĆ: ${message}\n\nInstrukcje:\n- Jeśli "ty zawsze/ty nigdy": zasugeruj "Czuję się..., gdy..."\n- Jeśli "rozumiem/słyszę cię": pochwal\n- Jeśli negatywne emocje: zasugeruj przerwę\n- Jeśli porozumienie: zacelebrowa\n- Inaczej: pusta odpowiedź` 
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      })
    });

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim();

    // Jeśli pusta odpowiedź lub "pusta" - nie interweniuj
    if (!aiResponse || aiResponse.toLowerCase().includes('pusta') || aiResponse === '') {
      return new Response(
        JSON.stringify({ intervene: false }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ intervene: true, message: aiResponse }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});