import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { bce_number } = await req.json();

    // 1. Extract digits
    const digits = (bce_number || '').replace(/\D/g, '');
    let padded = digits;
    if (digits.length === 9) padded = '0' + digits;
    if (padded.length !== 10) {
      return Response.json({ valid: false, error: 'Numéro BCE invalide (doit contenir 9 ou 10 chiffres)' });
    }

    // 2. Validate modulo-97 checksum
    const base = BigInt(padded.slice(0, 8));
    const checkDigits = parseInt(padded.slice(8), 10);
    const remainder = Number(base % 97n);
    const expected = remainder === 0 ? 97 : 97 - remainder;
    if (expected !== checkDigits) {
      return Response.json({ valid: false, error: 'Numéro BCE invalide (checksum incorrect)' });
    }

    // 3. Format
    const formatted = `${padded.slice(0, 4)}.${padded.slice(4, 7)}.${padded.slice(7, 10)}`;

    // 4. Try KBO public lookup
    try {
      const url = `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${padded}&actionLu=Zoek`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const html = await res.text();

      if (html.includes(formatted)) {
        // Extract company name from h2 tag
        const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        const name = h2Match
          ? h2Match[1].replace(/<[^>]+>/g, '').trim()
          : null;

        return Response.json({
          valid: true,
          formatted,
          company: { name, status: 'Active', address: null, activity: null },
        });
      }
    } catch (fetchErr) {
      console.warn('KBO fetch failed:', fetchErr.message);
    }

    // 5. Checksum passed but couldn't fetch details
    return Response.json({ valid: true, formatted, company: null });

  } catch (error) {
    console.error('checkBce error:', error);
    return Response.json({ valid: false, error: error.message });
  }
});