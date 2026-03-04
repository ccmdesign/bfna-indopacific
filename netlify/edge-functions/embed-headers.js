// Strip X-Frame-Options and override CSP for embed routes.
// Netlify merges headers from all matching [[headers]] rules,
// so the /* catch-all leaks X-Frame-Options: DENY onto /embed/*.
// This edge function removes it and sets the correct frame-ancestors.
export default async (request, context) => {
  const response = await context.next();
  response.headers.delete("X-Frame-Options");
  response.headers.set("Content-Security-Policy", "frame-ancestors *");
  return response;
};

export const config = { path: "/embed/*" };
