"use strict";

const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";
const ALLOWED_CATEGORIES = new Set([
  "pet.veterinary",
  "pet.animal_shelter",
  "pet.shop",
  "pet.service",
  "pet.dog_park"
]);

function sendJson(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  response.end(JSON.stringify(body));
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { message: "Method not allowed." });
  }

  const apiKey = String(process.env.VITE_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY || "").trim();
  if (!apiKey) {
    return sendJson(response, 503, { message: "Geoapify is not configured on the server." });
  }

  const requestedCategories = String(request.query.categories || "")
    .split(",")
    .map(value => value.trim())
    .filter(value => ALLOWED_CATEGORIES.has(value));

  const south = parseNumber(request.query.south);
  const west = parseNumber(request.query.west);
  const north = parseNumber(request.query.north);
  const east = parseNumber(request.query.east);
  const limit = Math.min(200, Math.max(1, Number(request.query.limit || 150)));
  const lang = /^[a-z]{2}$/i.test(String(request.query.lang || "")) ? String(request.query.lang).toLowerCase() : "en";

  if (!requestedCategories.length || [south, west, north, east].some(value => value === null)) {
    return sendJson(response, 400, { message: "Invalid service search parameters." });
  }

  if (south >= north || west >= east || north - south > 2 || east - west > 2) {
    return sendJson(response, 400, { message: "The requested map area is invalid or too large." });
  }

  const params = new URLSearchParams({
    categories: requestedCategories.join(","),
    filter: `rect:${west},${south},${east},${north}`,
    bias: `rect:${west},${south},${east},${north}`,
    limit: String(limit),
    lang,
    apiKey
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(`${GEOAPIFY_URL}?${params.toString()}`, {
      headers: { Accept: "application/geo+json,application/json" },
      signal: controller.signal
    });

    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message = upstream.status === 429
        ? "Geoapify request limit reached. Please try again later."
        : upstream.status === 401 || upstream.status === 403
          ? "Geoapify server configuration was rejected."
          : payload.message || `Geoapify request failed (HTTP ${upstream.status}).`;
      return sendJson(response, upstream.status, { message });
    }

    return sendJson(response, 200, payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      return sendJson(response, 504, { message: "Geoapify took too long to respond." });
    }
    return sendJson(response, 502, { message: "Nearby services are temporarily unavailable." });
  } finally {
    clearTimeout(timeout);
  }
};
