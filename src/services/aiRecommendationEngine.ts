import { generateSagunResponse, SagunMessage } from '@/services/sagunProvider';

export interface RecommendedVendor {
  id: string;
  business_name: string;
  city: string;
  category: string;
  rating: number;
  ai_reasoning?: string; // Generated on the fly
}

/**
 * Parses raw vendors from DB, pipes them to Sagun for personalization,
 * and falls back to raw data gracefully if AI fails/unconfigured.
 */
export async function enrichVendorsWithAI(
  vendors: any[],
  customerContext: { category?: string, requirements?: string, city?: string }
): Promise<RecommendedVendor[]> {
  
  const formattedVendors = vendors.map(v => ({
    id: v.id,
    business_name: v.business_name,
    city: v.city,
    category: v.category || 'General',
    rating: parseFloat(v.rating || '0')
  }));

  // If there are no vendors to recommend, return empty safely.
  if (formattedVendors.length === 0) return [];

  // Build the strict system prompt
  const systemPrompt = `You are Sagun AI. Your task is to provide a brief, personalized 1-sentence recommendation reason for each vendor in the provided JSON array. 
  Context: User wants "${customerContext.category || 'any'}" in "${customerContext.city || 'any'}" with requirements: "${customerContext.requirements || 'none'}".
  CRITICAL RULE: DO NOT INVENT VENDORS. ONLY process the exact vendors provided in the JSON array below.
  OUTPUT FORMAT: A valid JSON array of objects with 'id' and 'ai_reasoning'. No markdown wrapping.
  INPUT JSON: ${JSON.stringify(formattedVendors.slice(0, 5))}`; // Limit to top 5 to save context window

  const llmMessages: SagunMessage[] = [
    { role: 'SYSTEM', content: systemPrompt }
  ];

  try {
    const aiResponseStr = await generateSagunResponse(llmMessages);
    
    // Check if the provider gracefully aborted (returning our standard fallback string)
    if (aiResponseStr.includes('unconfigured') || aiResponseStr.includes('unable to process')) {
      throw new Error('AI Provider fallback triggered');
    }

    // Try parsing the AI output as JSON
    const parsedReasons = JSON.parse(aiResponseStr.trim().replace(/```json/g, '').replace(/```/g, ''));
    
    // Map reasons back to original list
    return formattedVendors.map(v => {
      const matched = parsedReasons.find((r: any) => r.id === v.id);
      return {
        ...v,
        ai_reasoning: matched ? matched.ai_reasoning : undefined
      };
    });

  } catch (err: any) {
    // SILENT FALLBACK: If AI fails, timeout, or parses invalid JSON, simply return the vendors without ai_reasoning.
    console.error('AI Recommendation enrichment failed, falling back to raw list:', err.message);
    return formattedVendors;
  }
}
