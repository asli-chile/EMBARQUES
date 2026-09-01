import { defineMiddleware } from "astro:middleware";
import { stripBasePathname, withBase } from "@/lib/basePath";
import { resolvePageSession } from "@/lib/auth/resolvePageSession";
import { checkRouteAccess, matchRouteAccess, shouldSkipRouteMiddleware } from "@/lib/auth/routeAccess";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (shouldSkipRouteMiddleware(pathname)) {
    return next();
  }

  const route = stripBasePathname(pathname);
  const rule = matchRouteAccess(route);

  if (rule.kind === "public") {
    return next();
  }

  const session = await resolvePageSession(context.cookies);
  context.locals.session = session;

  const access = checkRouteAccess(rule, session);
  if (access.ok) {
    return next();
  }

  if (access.reason === "unauthenticated") {
    const params = new URLSearchParams({ auth: "login", next: pathname });
    return context.redirect(`${withBase("/inicio")}?${params.toString()}`);
  }

  return context.redirect(`${withBase("/inicio")}?forbidden=1`);
});
