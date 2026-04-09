import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bce_number } = await req.json();

    if (!bce_number) {
      return Response.json({ valid: false, error: 'Numéro BCE manquant' });
    }

    // 1. Extract digits
    let digits = bce_number.replace(/\D/g, '');

    // Pad to 10 if 9 digits provided (prefix with 0)
    if (digits.length === 9) digits = '0' + digits;

    if (digits.length !== 10) {
      return Response.json({ valid: false, error: 'Numéro BCE invalide (9 ou 10 chiffres requis)' });
    }

    // 2. Validate modulo-97 checksum
    const num = BigInt(digits.slice(0, 8));
    const remainder = Number(num % 97n);
    const expectedCheck = remainder === 0 ? 97 : 97 - remainder;
    const actualCheck = parseInt(digits.slice(8), 10);

    if (expectedCheck !== actualCheck) {
      return Response.json({ valid: false, error: 'Numéro BCE invalide (checksum incorrect)' });
    }

    // 3. Format as XXXX.XXX.XXX
    const formatted = `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}`;

    // 4. Try KBO public scrape
    try {
      const url = `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${digits}&actionLu=Zoek`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (response.ok) {
        const html = await response.text();

        if (html.includes(formatted)) {
          // Extract company name from h2 tag
          const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
          const companyName = h2Match ? h2Match[1].trim() : null;

          return Response.json({
            valid: true,
            formatted,
            company: companyName
              ? { name: companyName, status: 'Active', address: null, activity: null }
              : null,
          });
        }
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