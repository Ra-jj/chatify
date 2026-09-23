import dns from "dns";
import net from "net";
import ogs from "open-graph-scraper";
import { Agent, fetch } from "undici";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const PREVIEW_TIMEOUT_MS = 5000;
const MAX_PREVIEW_HTML_BYTES = 512 * 1024;
const MAX_PREVIEW_HEAD_TAGS = 200;
const MAX_PREVIEW_TITLE_LENGTH = 300;
const MAX_PREVIEW_DESCRIPTION_LENGTH = 1000;

// Both patterns can only start matching at "<" and stop at the next "<", so matching
// time grows linearly with the page size, including on malformed or hostile markup.
const TITLE_TAG_PATTERN = /<title\b[^<>]*>[^<]*<\/title\s*>/i;
const META_OR_LINK_TAG_PATTERN = /<(?:meta|link)\b(?:[^<>"']|"[^"<]*"|'[^'<]*')*>/gi;

const isBlockedIPv4 = (address) => {
  const [first, second, third] = address.split(".").map(Number);
  return (
    first === 0 || // 0.0.0.0/8
    first === 10 || // 10.0.0.0/8 private
    first === 127 || // 127.0.0.0/8 loopback
    (first === 100 && second >= 64 && second <= 127) || // 100.64.0.0/10 CGNAT
    (first === 169 && second === 254) || // 169.254.0.0/16 link-local, includes cloud metadata endpoints
    (first === 172 && second >= 16 && second <= 31) || // 172.16.0.0/12 private
    (first === 192 && second === 0 && third === 0) || // 192.0.0.0/24 IETF protocol assignments
    (first === 192 && second === 168) || // 192.168.0.0/16 private
    (first === 198 && (second === 18 || second === 19)) || // 198.18.0.0/15 benchmarking
    first >= 224 // multicast, reserved and broadcast
  );
};

// Expands an IPv6 address (with "::" and an optional dotted IPv4 tail) into its 8 numeric groups.
// Callers must pass an address that net.isIPv6 accepts.
const expandIPv6 = (address) => {
  let normalized = address.split("%")[0].toLowerCase();

  const lastColonIndex = normalized.lastIndexOf(":");
  const tail = normalized.slice(lastColonIndex + 1);
  if (tail.includes(".")) {
    const [a, b, c, d] = tail.split(".").map(Number);
    const highGroup = ((a << 8) | b).toString(16);
    const lowGroup = ((c << 8) | d).toString(16);
    normalized = `${normalized.slice(0, lastColonIndex + 1)}${highGroup}:${lowGroup}`;
  }

  const [head, rest] = normalized.split("::");
  const headGroups = head ? head.split(":") : [];
  const restGroups = rest ? rest.split(":") : [];
  const zeroGroups = new Array(8 - headGroups.length - restGroups.length).fill("0");

  return [...headGroups, ...zeroGroups, ...restGroups].map((group) => parseInt(group, 16));
};

// Two 16-bit IPv6 groups holding an IPv4 address, as dotted IPv4 text.
const groupsToIPv4 = (highGroup, lowGroup) =>
  [highGroup >> 8, highGroup & 0xff, lowGroup >> 8, lowGroup & 0xff].join(".");

const isBlockedIPv6 = (address) => {
  const groups = expandIPv6(address);
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

  // ::/96 (includes :: and ::1), IPv4-mapped ::ffff:0:0/96 and NAT64 64:ff9b::/96
  // carry an IPv4 address in their last 32 bits, which gets the IPv4 rules.
  const hasZeroMiddle = g2 === 0 && g3 === 0 && g4 === 0;
  const isIPv4Compatible = g0 === 0 && g1 === 0 && hasZeroMiddle && g5 === 0;
  const isIPv4Mapped = g0 === 0 && g1 === 0 && hasZeroMiddle && g5 === 0xffff;
  const isNat64 = g0 === 0x64 && g1 === 0xff9b && hasZeroMiddle && g5 === 0;
  if (isIPv4Compatible || isIPv4Mapped || isNat64) {
    return isBlockedIPv4(groupsToIPv4(g6, g7));
  }

  // 6to4 2002::/16 carries an IPv4 address in groups 1-2
  if (g0 === 0x2002) {
    return isBlockedIPv4(groupsToIPv4(g1, g2));
  }

  return (
    (g0 & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (g0 & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (g0 & 0xffc0) === 0xfec0 || // fec0::/10 site-local (deprecated)
    (g0 & 0xff00) === 0xff00 // ff00::/8 multicast
  );
};

export const isBlockedAddress = (address) => {
  if (net.isIPv4(address)) return isBlockedIPv4(address);
  if (net.isIPv6(address)) return isBlockedIPv6(address);
  return true;
};

// Early reject before any connection is opened. Bare IP literals resolve to themselves,
// so they go through the same check; Node does not call a custom lookup for IP literals,
// so for those this is the only check, and an IP literal cannot resolve differently later.
const isPublicHttpUrl = async (parsedUrl) => {
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return false;

  const hostname = parsedUrl.hostname.replace(/^\[(.*)\]$/, "$1");
  if (!hostname) return false;

  const addresses = await dns.promises.lookup(hostname, { all: true });
  return addresses.length > 0 && addresses.every(({ address }) => !isBlockedAddress(address));
};

// net.connect calls this to resolve the host for the connection undici opens, so the
// addresses checked here are the addresses connected to. A name that passed
// isPublicHttpUrl cannot switch to an internal address before the connection is made.
// net passes options.all = true when it wants every address (autoSelectFamily), and
// expects (error, address, family) otherwise.
const guardedLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);

    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
      const blockedError = new Error(`Link preview connection refused, ${hostname} resolved to a non-public address`);
      blockedError.code = "ERR_LINK_PREVIEW_NON_PUBLIC_ADDRESS";
      return callback(blockedError);
    }

    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};

const previewAgent = new Agent({ connect: { lookup: guardedLookup } });

// Returns at most MAX_PREVIEW_HTML_BYTES of decoded (decompressed) HTML as UTF-8 text,
// or null when the response is not a successful HTML page.
const fetchPreviewHtml = async (url) => {
  // redirect: "error" makes fetch reject any 3xx response instead of following it,
  // so a public URL cannot redirect the request to an internal address.
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
    dispatcher: previewAgent,
    headers: { Accept: "text/html" },
  });

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!response.ok || !contentType.includes("text/html") || !response.body) {
    await response.body?.cancel();
    console.log(`Link preview skipped, response status ${response.status} with content-type "${contentType}"`);
    return null;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let keptBytes = 0;

  while (keptBytes < MAX_PREVIEW_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;

    const remainingBytes = MAX_PREVIEW_HTML_BYTES - keptBytes;
    const keptChunk = value.byteLength > remainingBytes ? value.subarray(0, remainingBytes) : value;
    chunks.push(keptChunk);
    keptBytes += keptChunk.byteLength;
  }

  if (keptBytes >= MAX_PREVIEW_HTML_BYTES) {
    // Stops reading (and decompressing) the rest of the body and releases the connection
    await reader.cancel();
  }

  return Buffer.concat(chunks).toString("utf8");
};

// A DOM parse of the page takes time that grows with the square of its nesting depth
// (measured: 64 KB of nested <div>s blocked the event loop for 1.9 s in open-graph-scraper),
// so only the <title>, <meta> and <link> tags, which carry the preview fields used here,
// are passed on as a small flat document.
const buildPreviewHeadHtml = (html) => {
  const titleTag = TITLE_TAG_PATTERN.exec(html)?.[0] ?? "";

  const headTags = [];
  for (const match of html.matchAll(META_OR_LINK_TAG_PATTERN)) {
    headTags.push(match[0]);
    if (headTags.length >= MAX_PREVIEW_HEAD_TAGS) break;
  }

  return `<html><head>${titleTag}${headTags.join("")}</head></html>`;
};

// Page metadata is attacker-controlled; only http(s) links are kept so a preview
// can never carry a javascript: or data: URL into an href or src. Relative values
// are resolved against the page URL.
const toHttpUrlOrUndefined = (value, pageUrl) => {
  if (typeof value !== "string") return undefined;
  try {
    const parsedUrl = new URL(value, pageUrl);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? parsedUrl.href : undefined;
  } catch {
    return undefined;
  }
};

const truncate = (value, maxLength) => (typeof value === "string" ? value.slice(0, maxLength) : undefined);

// Returns preview data for the first URL in the text, or null. Never throws.
export const fetchLinkPreview = async (text) => {
  const urls = text.match(URL_PATTERN);
  if (!urls || urls.length === 0) return null;

  try {
    const parsedUrl = new URL(urls[0]);

    if (!(await isPublicHttpUrl(parsedUrl))) {
      console.log("Link preview skipped, host resolves to a non-public address:", parsedUrl.hostname);
      return null;
    }

    const html = await fetchPreviewHtml(parsedUrl.href);
    if (!html) return null;

    // With `html` (and no `url`), open-graph-scraper only parses; it makes no request of its own.
    const { result } = await ogs({ html: buildPreviewHeadHtml(html) });
    if (!result.success) return null;

    return {
      title: truncate(result.ogTitle, MAX_PREVIEW_TITLE_LENGTH),
      description: truncate(result.ogDescription, MAX_PREVIEW_DESCRIPTION_LENGTH),
      image: toHttpUrlOrUndefined(result.ogImage?.[0]?.url, parsedUrl.href),
      url: toHttpUrlOrUndefined(result.ogUrl, parsedUrl.href) || parsedUrl.href,
    };
  } catch (error) {
    // undici reports connection failures as "fetch failed" with the underlying error in `cause`;
    // open-graph-scraper rejects with a plain object ({ error, result }), not an Error instance.
    console.log("Error fetching link preview:", error?.cause?.message || error?.result?.error || error?.message);
    return null;
  }
};
