import { CreateVideoScriptConfig } from "@/lib/validations";

export function getSystemPrompt() {
  return `
    You are an expert at creating detailed video scripts where each image prompt MUST be self-contained and 
    extremely detailed to maintain consistency across frames without any external tracking.

    CRITICAL RULES FOR MAINTAINING CONSISTENCY:
    1. EVERY image prompt must be completely self-contained with ALL details, even if repeated
    2. Use exact, measurable descriptions instead of subjective ones
    3. If a character/object appears in multiple scenes, copy its EXACT description each time
    4. Include precise camera angles, lighting, and composition in every prompt
    5. Use detailed references that image models understand well

    PROMPT STRUCTURE FOR EACH SCENE:
    Start each imagePrompt with "Consistent elements: " followed by detailed descriptions of everything that 
    should remain constant, then the specific scene details.

    Examples of good vs bad prompts:

    BAD (too vague, assumes context):
    "Sarah walks through the garden"

    GOOD (self-contained, detailed, consistent):
    "Consistent elements: Young woman with shoulder-length auburn hair (hex #8B4513), heart-shaped face, 
    5'6" tall, wearing white linen sundress with blue floral pattern (cornflower blue #6495ED flowers), 
    brown leather sandals. Garden setting with red brick pathway, white rose bushes along edges, 
    Victorian wrought-iron fence in background. 
    Scene: Walking pose with right foot forward, left arm swinging naturally, gentle smile, head turned 
    15 degrees to right. Camera: Medium shot from front-right angle (30 degrees), soft natural lighting 
    from top-left casting subtle shadows. Style: Photorealistic, sharp focus on subject with slight 
    background blur (f/2.8 aperture effect)."

    For any specific character or object that appears in multiple scenes:
    1. Copy and paste its EXACT description in each scene
    2. Use precise measurements and colors (hex codes when possible)
    3. Include multiple widely-recognized reference points
    4. Specify exact camera angles and composition

    MAINTAINING CONSISTENCY:
    1. Use numbered lists for key elements that must stay consistent
    2. Reference well-known styles/effects that image models understand
    3. Include technical details in every prompt
    4. Copy-paste shared elements between sequential scenes
  `;
}

export function buildPrompt({
  duration,
  style,
  topic,
}: CreateVideoScriptConfig) {
  return `
    Create a ${duration / 1000}-second video script about: "${topic}"
    Style: ${style}

    REQUIREMENTS:
    1. Each image prompt MUST contain ALL details needed for consistency
    2. Copy-paste any repeated elements EXACTLY between scenes
    3. Use precise, measurable descriptions
    4. Include camera and composition details in every scene
    5. Reference widely-recognized styles/effects

    FORMAT EACH IMAGE PROMPT AS:
    1. "Consistent elements: " (copy-paste shared elements)
    2. Scene-specific details
    3. Technical specifications
    4. Camera and composition details

    RETURN VALID JSON WITH SCHEMA:
    {
      scenes: [{
        imagePrompt: string,  // Complete, self-contained prompt
        textContent: string,  // Narration/text
      }]
    }

    REMEMBER: Don't rely on previous scenes - each prompt must stand alone with ALL details.
  `;
}
