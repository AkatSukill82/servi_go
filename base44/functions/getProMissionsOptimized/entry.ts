import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Optimized pro missions fetch with pagination
 * Handles filtering + sorting for 10k+ pros without timeout
 * Used by ProDashboard, ProAgenda for efficient data loading
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pagination params
    const page = Math.max(1, parseInt(body.page || 1));
    const pageSize = Math.min(50, parseInt(body.pageSize || 20)); // Cap at 50
    const statusFilter = body.status || 'all';
    const skip = (page - 1) * pageSize;

    // Build filter for pro's missions
    const filter = {
      professional_email: user.email,
      ...(statusFilter !== 'all' && { status: statusFilter }),
    };

    // Fetch total count + paginated results
    const [allMissions, total] = await Promise.all([
      base44.asServiceRole.entities.ServiceRequestV2.filter(
        filter,
        '-created_date',
        pageSize,
        skip
      ),
      base44.asServiceRole.entities.ServiceRequestV2.filter(filter, '-created_date', 10000)
        .then(m => m.length),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return Response.json({
      status: 'success',
      data: allMissions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('getProMissionsOptimized error:', error);
    return Response.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
});