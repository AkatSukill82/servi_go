import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Utilise le service role pour bypasser les RLS sur User
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const professionals = allUsers.filter(u => u.user_type === 'professionnel' && !u.account_deleted);

    return Response.json({ professionals });
  } catch (error) {
    console.error('getProfessionals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});