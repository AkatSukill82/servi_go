import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { bce_number } = await req.json();
    if (!bce_number) return Response.json({ valid: false, error: 'Numéro BCE manquant' });

    // 1. Extract digits
    let digits = bce_number.replace(/[^0-9]/g, '');
    if (digits.length === 9) digits = '0' + digits;
    if (digits.length !== 10) return Response.json({ valid: false, error: 'Numéro BCE invalide (doit comporter 9 ou 10 chiffres)' });

    // 2. Modulo-97 checksum validation
    const base = BigInt(digits.slice(0, 8));
    const checkDigits = parseInt(digits.slice(8, 10), 10);
    let expected = 97 - Number(base % 97n);
    if (expected === 97) expected = 97;
    if (expected !== checkDigits) {
      return Response.json({ valid: false, error: 'Numéro BCE invalide (checksum incorrect)' });
    }

    // 3. Format as XXXX.XXX.XXX
    const formatted = `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}`;

    // 4. Try KBO public scrape
    try {
      const url = `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${digits}&actionLu=Zoek`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const html = await res.text();
        if (html.includes(formatted)) {
          // Extract company name from h2 tag
          const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          const name = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : null;
          console.log(`BCE ${formatted} found in KBO, name: ${name}`);
          return Response.json({
            valid: true,
            formatted,
            company: { name: name || null, status: 'Active', address: null, activity: null },
          });
        }
      }
    } catch (fetchErr) {
      console.warn('KBO fetch failed:', fetchErr.message);
    }

    // 5. Checksum passed but couldn't fetch details
    console.log(`BCE ${formatted} checksum valid, KBO details unavailable`);
    return Response.json({ valid: true, formatted, company: null });

  } catch (error) {
    console.error('checkBce error:', error.message);
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
});