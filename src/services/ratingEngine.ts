import { query, transaction } from '@/lib/db';

/**
 * Re-calculates and strictly aggregates vendor ratings across all valid, published reviews.
 */
export async function recalculateVendorRating(vendorId: string) {
  // Query only published and verified reviews
  const [result] = await query<any[]>(
    `SELECT COUNT(id) as reviewCount, AVG(rating) as avgRating 
     FROM reviews 
     WHERE vendor_id = ? AND moderation_status = 'PUBLISHED' AND is_verified_booking = TRUE`,
    [vendorId]
  );

  const reviewCount = parseInt(result?.reviewCount || '0', 10);
  // Default to 4.80 if no reviews exist, otherwise use exact average formatted to 2 decimals
  const avgRating = reviewCount > 0 ? parseFloat(parseFloat(result?.avgRating || '0').toFixed(2)) : 4.80;

  await query(
    `UPDATE vendors SET rating = ?, review_count = ? WHERE id = ?`,
    [avgRating, reviewCount, vendorId]
  );

  return { reviewCount, avgRating };
}
