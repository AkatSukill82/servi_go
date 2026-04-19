import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, event } = payload;
    const professionalEmail = data?.professional_email;

    if (!professionalEmail) {
      return Response.json({ ok: true, skipped: 'no professional_email' });
    }

    // Recalculate average rating from all reviews for this pro
    const allReviews = await base44.asServiceRole.entities.Review.filter(
      { professional_email: professionalEmail },
      '-created_date',
      500
    );

    if (allReviews.length === 0) {
      return Response.json({ ok: true, skipped: 'no reviews' });
    }

    const avg = Math.round((allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length) * 10) / 10;
    const count = allReviews.length;

    // Update Professional entity (matched by email)
    const pros = await base44.asServiceRole.entities.Professional.filter(
      { email: professionalEmail },
      '-created_date',
      1
    );

    if (pros.length > 0) {
      await base44.asServiceRole.entities.Professional.update(pros[0].id, {
        rating: avg,
        reviews_count: count,
      });
    }

    // Also update User entity for display in public profile
    const users = await base44.asServiceRole.entities.User.filter(
      { email: professionalEmail },
      '-created_date',
      1
    );
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        rating: avg,
        reviews_count: count,
      });
    }

    console.log(`Rating updated for ${professionalEmail}: ${avg} (${count} reviews)`);
    return Response.json({ ok: true, rating: avg, reviews_count: count });
  } catch (error) {
    console.error('updateProRatingOnReview error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});