// generate-render: Backyard AI render pipeline (Step 1: aerial -> ground-level
// photo, Step 2: add a pergola). Holds GEMINI_API_KEY server-side so it's
// never exposed to the browser. See CLAUDE.md spec for the business context.
//
// Request:  POST { step: 1 | 2, jobId: string, imagePaths: string[] }
//   step 1 needs exactly 4 imagePaths (the aerial reference images)
//   step 2 needs exactly 1 imagePath (the step-1 output)
// Response: { outputPath: string, outputUrl: string }

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { encodeBase64, decodeBase64 } from 'jsr:@std/encoding@1/base64';

const BUCKET = 'render-jobs';
const GEMINI_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STEP1_PROMPT = `You are given 4 photographs captured from Google Earth's 3D fly-around view of a residential backyard, each showing the same property from a different oblique, rotated angle. These images contain two kinds of non-physical artifacts you must disregard entirely: (1) photogrammetry mesh artifacts — warped, melting, or jagged geometry near rooflines and image borders, which are capture/reconstruction artifacts, not real structure; and (2) an on-screen UI location pin or text label baked into the image, which is an interface overlay, not part of the scene.

Use all 4 images together to triangulate the true 3D layout of the yard: pool shape and position, patio material and extent, house wall orientation and rear elevation, fence lines, and landscaping. From that understanding, generate ONE new photorealistic, eye-level, wide-angle ground-level photograph of this backyard — the kind of shot a real-estate photographer would take standing at the back of the yard looking toward the house.

Choose the vantage point that gives the fullest, most flattering view of the yard in a single frame — typically from the far end of the pool or patio area looking back toward the house — so that the pool, surrounding patio/hardscape, patio furniture, the house's full rear elevation, fencing, and landscaping are all visible and coherently arranged in one shot.

Render in natural daylight under a clear sky. The output must read as an actual photograph: no visible seams, warping, stylization, or leftover reconstruction artifacts from the source images.`;

const STEP2_PROMPT = `You are given a single photorealistic ground-level photograph of a backyard showing a pool, patio, and the rear of a house.

Add a pergola to the single best-suited location in this exact photo — typically directly over or immediately adjacent to the existing patio seating/dining area, not floating in an unrelated part of the yard. Match its scale, perspective, lighting, and shadow direction exactly to the existing photo, using the same sun angle already visible in the image.

Before choosing the pergola's design, assess how upscale this specific house and backyard appear from the cues visible in the photo: house size and roofline complexity, pool size/shape and finish quality, patio material (stamped concrete vs. plain concrete vs. pavers vs. natural stone), and landscaping density/quality. Then select exactly ONE of the following tiers accordingly, and design the pergola to match it:

- Baseline/affordable (modest homes, plain concrete or basic paver patios, simple landscaping): natural stained cedar or wood-tone post-and-beam construction with a simple cross-lattice roof (no solid roof or louvers), attached to the house at the roofline and spanning the existing patio dining area, extending out toward the pool edge. Add exactly one upgrade touch — integrated string lighting along the beams — and nothing more elaborate.
- Mid-tier (above-average homes, nicer pavers or stamped concrete, moderate landscaping): a larger-footprint pergola in mixed wood tones or a painted/white-washed finish, with a partial louvered or shade-cloth roof section, and nicer furniture staged underneath.
- High-end/luxury (large homes, natural stone or high-end finishes, dense/manicured landscaping, large pool): steel or high-grade cedar combination posts, a fully adjustable louvered roof, a stone or masonry post base, built-in lighting, and possibly a ceiling fan or heater, sized to match a larger patio footprint.

The pergola must read as a realistic, buildable structure appropriate to the home's actual architectural style — not fantastical or overly ornate beyond its tier. Every other part of the image (pool, existing patio, house, landscaping, sky, lighting) must remain exactly as it appeared in the input photo — this is a targeted addition to the scene, not a regeneration.`;

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function extForMimeType(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { step, jobId, imagePaths } = await req.json();

    if (step !== 1 && step !== 2) return errorResponse('step must be 1 or 2');
    if (!jobId || typeof jobId !== 'string') return errorResponse('jobId is required');
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) return errorResponse('imagePaths is required');
    if (step === 1 && imagePaths.length !== 4) return errorResponse('step 1 requires exactly 4 imagePaths');
    if (step === 2 && imagePaths.length !== 1) return errorResponse('step 2 requires exactly 1 imagePath');

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) return errorResponse('GEMINI_API_KEY is not configured on the server', 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch each input image from storage and base64-encode it.
    const imageParts = [];
    for (const path of imagePaths) {
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error || !data) return errorResponse(`Could not read ${path}: ${error?.message || 'not found'}`, 404);
      const bytes = new Uint8Array(await data.arrayBuffer());
      const base64 = encodeBase64(bytes);
      const mimeType = data.type || 'image/jpeg';
      imageParts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    }

    const prompt = step === 1 ? STEP1_PROMPT : STEP2_PROMPT;
    const geminiBody = {
      contents: [{ parts: [...imageParts, { text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '16:9', imageSize: '4K' },
      },
    };

    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return errorResponse(`Gemini API error (${geminiRes.status}): ${errText.slice(0, 500)}`, 502);
    }

    const geminiJson = await geminiRes.json();
    const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData || p.inline_data);
    const inlineData = imagePart?.inlineData || imagePart?.inline_data;

    if (!inlineData?.data) {
      const finishReason = geminiJson?.candidates?.[0]?.finishReason;
      const textPart = parts.find((p: any) => p.text)?.text;
      return errorResponse(
        `Model did not return an image (finishReason: ${finishReason || 'unknown'}). ${textPart || ''}`.trim(),
        502,
      );
    }

    const outMimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
    const outExt = extForMimeType(outMimeType);
    const outputPath = `${jobId}/step${step}-output.${outExt}`;
    const outputBytes = decodeBase64(inlineData.data);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(outputPath, outputBytes, { contentType: outMimeType, upsert: true });
    if (uploadError) return errorResponse(`Failed to save output: ${uploadError.message}`, 500);

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(outputPath);

    return new Response(JSON.stringify({ outputPath, outputUrl: publicUrlData.publicUrl }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-render failed:', err);
    return errorResponse(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
});
