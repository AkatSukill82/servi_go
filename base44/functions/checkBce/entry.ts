import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Normalize BCE: extract 10 digits
function extractDigits(raw) {
  return raw.replace(/[^0-9]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bce_number } = await req.json();

    if (!bce_number) {
      return Response.json({ valid: false, error: 'No BCE number provided' });
    }

    const digits = extractDigits(bce_number);
    if (digits.length !== 10) {
      return Response.json({ valid: false, error: 'Invalid format' });
    }

    // Query the public KBO/BCE Open Data API
    const formatted = `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}`;
    const url = `https://kbopub.economie.fgov.be/kbopub/tabellenretrieveaction.do?wsdlserv=false&lang=fr&nummer=${digits}`;

    // Use the official BCE search API (Open Data)
    const apiUrl = `https://kbopub.economie.fgov.be/kbopub/zoeknummerformulier.html?nummer=${digits}&actionLu=Rechercher`;

    // Try the Open Data REST endpoint
    const res = await fetch(
      `https://kbopub.economie.fgov.be/kbopub/tabellenretrieveaction.do?wsdlserv=false&lang=fr&id=${digits}&actionLu=Rechercher`,
      { headers: { 'Accept': 'application/json' } }
    );

    // Fallback: use the AI to verify via web search if the direct API fails
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // We'll use base44 integrations instead
      }
    }).catch(() => null);

    // Use base44 LLM with web search to validate and fetch company info
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Look up the Belgian company with BCE/KBO number ${formatted} (digits: ${digits}).
      Search the KBO public database at kbopub.economie.fgov.be or other Belgian business registries.
      Return a JSON with:
      - valid: boolean (true if the company exists and is active/registered)
      - name: company name (string or null)
      - status: legal status in French (e.g. "Active", "En faillite", "Radiée", or null)
      - address: registered address (string or null)  
      - activity: main activity/sector (string or null)
      If you cannot find the company, return valid: false.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          name: { type: 'string' },
          status: { type: 'string' },
          address: { type: 'string' },
          activity: { type: 'string' },
        },
      },
    });

    console.log('BCE lookup result:', JSON.stringify(llmResult));

    return Response.json({
      valid: llmResult.valid === true,
      company: llmResult.valid ? {
        name: llmResult.name || null,
        status: llmResult.status || null,
        address: llmResult.address || null,
        activity: llmResult.activity || null,
      } : null,
    });
  } catch (error) {
    console.error('checkBce error:', error.message);
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
});