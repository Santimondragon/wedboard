/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dashboard from "../dashboard.js";
import type * as drinks from "../drinks.js";
import type * as events from "../events.js";
import type * as guests from "../guests.js";
import type * as invitations from "../invitations.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_guests from "../lib/guests.js";
import type * as lib_options from "../lib/options.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_public from "../lib/public.js";
import type * as lib_slug from "../lib/slug.js";
import type * as media from "../media.js";
import type * as menu from "../menu.js";
import type * as messages from "../messages.js";
import type * as seed from "../seed.js";
import type * as specialEvents from "../specialEvents.js";
import type * as tables from "../tables.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  dashboard: typeof dashboard;
  drinks: typeof drinks;
  events: typeof events;
  guests: typeof guests;
  invitations: typeof invitations;
  "lib/auth": typeof lib_auth;
  "lib/guests": typeof lib_guests;
  "lib/options": typeof lib_options;
  "lib/permissions": typeof lib_permissions;
  "lib/public": typeof lib_public;
  "lib/slug": typeof lib_slug;
  media: typeof media;
  menu: typeof menu;
  messages: typeof messages;
  seed: typeof seed;
  specialEvents: typeof specialEvents;
  tables: typeof tables;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
