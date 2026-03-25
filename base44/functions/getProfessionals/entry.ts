import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const professionals = await base44.asServiceRole.entities.Professional.list('-created_date', 200);
    return Response.json({ professionals });
  } catch (error) {
    console.error('getProfessionals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});