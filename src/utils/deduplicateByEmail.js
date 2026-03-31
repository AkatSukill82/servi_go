/**
 * Déduplique une liste de professionnels par email.
 * Garde uniquement l'enregistrement avec la created_date la plus récente.
 */
export function deduplicateByEmail(professionals) {
  const map = new Map();
  for (const pro of professionals) {
    const email = pro.email;
    if (!email) continue;
    const existing = map.get(email);
    if (!existing) {
      map.set(email, pro);
    } else {
      const existingDate = existing.created_date ? new Date(existing.created_date) : new Date(0);
      const newDate = pro.created_date ? new Date(pro.created_date) : new Date(0);
      if (newDate > existingDate) map.set(email, pro);
    }
  }
  // Keep pros without email as-is
  const noEmail = professionals.filter(p => !p.email);
  return [...map.values(), ...noEmail];
}