/**
  Extract offer ID and validate URL.
  Rules:
  - Validate URL belongs to 1688 before calling Apify.
  - Extract offerId using regex: /offer\/(\d{8,})/i

  Returns object { offerId: string } or throws Error with message 'INVALID_1688_URL' or 'OFFER_ID_NOT_FOUND'.
 */
export function extractOfferId(urlStr) {
  if (typeof urlStr !== 'string' || !urlStr.trim()) {
    throw new Error('MISSING_URL');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlStr.trim());
  } catch (e) {
    throw new Error('INVALID_1688_URL');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const is1688Domain = hostname.endsWith('1688.com');

  if (!is1688Domain) {
    throw new Error('INVALID_1688_URL');
  }

  // Extract offerId using regex: /offer\/(\d{8,})/i
  const match = parsedUrl.pathname.match(/offer\/(\d{8,})/i) || urlStr.match(/offer\/(\d{8,})/i);

  if (!match || !match[1]) {
    throw new Error('OFFER_ID_NOT_FOUND');
  }

  return { offerId: match[1] };
}
