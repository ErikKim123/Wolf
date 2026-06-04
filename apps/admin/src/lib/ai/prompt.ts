// Design Ref: §5 — 고정 템플릿 프롬프트 (디자인 일관성: 제목/특징/이미지/상세 순서 통일)

export interface ProductPromptInput {
  name: string;
  keywords?: string;
  features: string[];
  imageUrls: string[];
  category?: string;
}

// 생성 결과 구조를 강하게 고정 → 상품마다 들쭉날쭉 방지 (가이드 Act)
export const PRODUCT_HTML_SYSTEM = `You are a product-page copywriter for the "Wolf" marketplace.
Output ONLY a valid HTML *fragment* — no markdown, no code fences, no <html>/<head>/<body>, and NEVER <script> or <style>.
Use this FIXED structure, in this exact order:
1. <h2> a punchy headline based on the product name
2. <p> a 2–3 sentence introduction
3. <h2>Key Features</h2> followed by <ul> with one <li> per feature
4. For EACH provided image URL: an <img src="THE_URL" alt="..."> tag. Use ONLY the URLs given — never invent URLs and never use base64/data URIs. If no URLs are given, omit images.
5. <h2>Details</h2> followed by one or two <p> with a richer description
Allowed tags only: h2, p, ul, li, img, strong, em. No classes, no inline styles, no event handlers, no links.
Write in clear, persuasive English.`;

export function buildProductPrompt(input: ProductPromptInput): string {
  const lines = [
    `Product name: ${input.name}`,
    input.category ? `Category: ${input.category}` : '',
    input.keywords ? `Keywords: ${input.keywords}` : '',
    input.features.length ? `Features:\n${input.features.map((f) => `- ${f}`).join('\n')}` : '',
    input.imageUrls.length
      ? `Image URLs (use each exactly once, in order):\n${input.imageUrls.map((u) => `- ${u}`).join('\n')}`
      : 'No image URLs provided.',
  ].filter(Boolean);
  return `Write the product detail page for:\n\n${lines.join('\n')}`;
}

const LANG_NAME: Record<string, string> = {
  ko: 'Korean',
  ja: 'Japanese',
  'zh-TW': 'Traditional Chinese (Taiwan)',
  en: 'English',
};

export const TRANSLATE_SYSTEM = `You translate HTML product descriptions.
Preserve ALL HTML tags, attributes, and structure EXACTLY. Translate only the human-readable text nodes.
Keep every <img src="..."> URL unchanged. Do not add or remove tags. Output ONLY the translated HTML fragment (no markdown, no code fences).`;

export function buildTranslatePrompt(html: string, targetLocale: string): string {
  const lang = LANG_NAME[targetLocale] ?? targetLocale;
  return `Translate the following product HTML into ${lang}:\n\n${html}`;
}
