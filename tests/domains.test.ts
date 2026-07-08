import { describe, expect, test } from "vitest";
import {
  normalizeCustomDomain,
  validateCustomDomain,
} from "../convex/lib/domains";

describe("normalizeCustomDomain", () => {
  test("lowercases and trims", () => {
    expect(normalizeCustomDomain("  Invites.MyWedding.COM ")).toBe(
      "invites.mywedding.com",
    );
  });

  test("strips protocol, path, query, port, and trailing dot", () => {
    expect(
      normalizeCustomDomain("https://mywedding.com/invitations/x?y=1"),
    ).toBe("mywedding.com");
    expect(normalizeCustomDomain("mywedding.com:3000")).toBe("mywedding.com");
    expect(normalizeCustomDomain("mywedding.com.")).toBe("mywedding.com");
  });
});

describe("validateCustomDomain", () => {
  test("accepts apex and subdomain hostnames", () => {
    expect(validateCustomDomain("mywedding.com")).toBeNull();
    expect(validateCustomDomain("invites.mywedding.com")).toBeNull();
    expect(validateCustomDomain("boda.mi-boda.com.mx")).toBeNull();
  });

  test("rejects empty, single-label, and malformed hostnames", () => {
    expect(validateCustomDomain("")).not.toBeNull();
    expect(validateCustomDomain("localhost")).not.toBeNull();
    expect(validateCustomDomain("-bad.com")).not.toBeNull();
    expect(validateCustomDomain("bad-.com")).not.toBeNull();
    expect(validateCustomDomain("bad domain.com")).not.toBeNull();
  });

  test("rejects non-ASCII (IDN must be punycode)", () => {
    expect(validateCustomDomain("bodä.com")).not.toBeNull();
    expect(validateCustomDomain("xn--bod-hoa.com")).toBeNull();
  });

  test("rejects vercel.app and the primary domain", () => {
    expect(validateCustomDomain("myapp.vercel.app")).not.toBeNull();
    expect(validateCustomDomain("127.0.0.1")).not.toBeNull();
    expect(validateCustomDomain("sub.localhost")).not.toBeNull();
  });
});
