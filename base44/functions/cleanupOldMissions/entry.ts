import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scheduled maintenance: archive cancelled/disputed missions older than 90 days
 * Keeps DB optimized for 10k+ users
 * Runs daily via scheduler
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString();

    // Soft-delete old cancelled/disputed missions
    const oldMissions = await base44.asServiceRole.entities.ServiceRequestV2.filter({
      status: { $in: ['cancelled', 'disputed'] },
      created_date: { $lt: cutoffDate },
    }, '-created_date', 1000);

    let archived = 0;
    for (const mission of oldMissions) {
      try {
        await base44.asServiceRole.entities.ServiceRequestV2.update(mission.id, {
          archived_at: new Date().toISOString(),
        });
        archived++;
      } catch (e) {
        console.warn(`Failed to archive mission ${mission.id}:`, e.message);
      }
    }

    console.log(`Archived ${archived} old missions`);

    return Response.json({
      status: 'success',
      archivedCount: archived,
      message: `Cleaned up ${archived} missions older than 90 days`,
    });
  } catch (error) {
    console.error('cleanupOldMissions error:', error);
    return Response.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
});