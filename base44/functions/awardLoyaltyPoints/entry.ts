import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIER_THRESHOLDS = { bronze: 0, silver: 200, gold: 500, platinum: 1000 };

function getTier(points) {
  if (points >= 1000) return 'platinum';
  if (points >= 500) return 'gold';
  if (points >= 200) return 'silver';
  return 'bronze';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_email, user_name, user_type, points_to_add, reason } = await req.json();

    if (!user_email || !points_to_add) {
      return Response.json({ error: 'user_email and points_to_add required' }, { status: 400 });
    }

    // Verify the caller can award points (self or admin)
    if (user.email !== user_email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find existing loyalty record
    const existing = await base44.asServiceRole.entities.LoyaltyPoints
      .filter({ user_email }, '-created_date', 1)
      .then(r => r[0] || null);

    const newHistoryEntry = {
      date: new Date().toISOString(),
      points: points_to_add,
      reason: reason || 'Mission complétée',
      type: 'earned',
    };

    if (existing) {
      const newTotal = (existing.total_points || 0) + points_to_add;
      const newAvailable = (existing.available_points || 0) + points_to_add;
      const newMissions = (existing.missions_count || 0) + 1;
      const newTier = getTier(newTotal);
      const history = [...(existing.history || []), newHistoryEntry].slice(-50); // keep last 50

      await base44.asServiceRole.entities.LoyaltyPoints.update(existing.id, {
        total_points: newTotal,
        available_points: newAvailable,
        missions_count: newMissions,
        tier: newTier,
        history,
      });

      return Response.json({ success: true, total_points: newTotal, tier: newTier });
    } else {
      // Create new loyalty record
      const record = await base44.asServiceRole.entities.LoyaltyPoints.create({
        user_email,
        user_name: user_name || user.full_name || '',
        user_type: user_type || user.user_type || 'particulier',
        total_points: points_to_add,
        used_points: 0,
        available_points: points_to_add,
        missions_count: 1,
        tier: getTier(points_to_add),
        history: [newHistoryEntry],
      });

      return Response.json({ success: true, total_points: points_to_add, tier: record.tier });
    }
  } catch (error) {
    console.error('awardLoyaltyPoints error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});