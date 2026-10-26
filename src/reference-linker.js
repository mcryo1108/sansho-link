"use strict";
var SanshoLink = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    shutdown: () => shutdown,
    startup: () => startup
  });

  // src/core/normalize.ts
  function normalizeDOI(value) {
    const match = value.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i);
    return match?.[0].replace(/[.,;:)\]}]+$/g, "").toLowerCase();
  }
  function normalizeArxiv(value) {
    const match = value.match(/(?:arxiv\s*:\s*)?((?:[a-z-]+\/\d{7})|(?:\d{4}\.\d{4,5}))(?:v\d+)?/i);
    return match?.[1]?.toLowerCase();
  }
  function normalizeTitle(value) {
    return value.normalize("NFKD").toLowerCase().replace(new RegExp("\\p{M}", "gu"), "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  }
  var CONTAINER_ALIASES = {
    "a a": "astronomy astrophysics",
    "astronomy astrophysics": "astronomy astrophysics",
    "apj": "astrophysical journal",
    "astrophysical journal": "astrophysical journal",
    "apjs": "astrophysical journal supplement series",
    "astrophysical journal supplement series": "astrophysical journal supplement series",
    "araa": "annual review astronomy astrophysics",
    "annual review astronomy astrophysics": "annual review astronomy astrophysics",
    "mnras": "monthly notices royal astronomical society",
    "monthly notices royal astronomical society": "monthly notices royal astronomical society",
    "ann phys": "annalen physik",
    "annalen physik": "annalen physik",
    "annalen der physik": "annalen physik",
    "j med": "journal medicine",
    "journal medicine": "journal medicine"
  };
  function normalizeContainerTitle(value) {
    const normalized = normalizeTitle(value).replace(/\bthe\b/g, " ").replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
    return CONTAINER_ALIASES[normalized] || normalized;
  }
  function normalizeVolume(value) {
    const match = value?.trim().match(/[A-Za-z]?\d+[A-Za-z]?/);
    return match?.[0].toLowerCase();
  }
  function normalizeLocator(value) {
    const first = value?.trim().split(/[-–—]/)[0]?.match(/[A-Za-z]?\d+/)?.[0];
    return first?.toLowerCase();
  }
  function surname(value) {
    if (!value) return void 0;
    return normalizeTitle(value).split(" ").filter(Boolean).at(-1);
  }
  function titleTokens(value) {
    return normalizeTitle(value).split(" ").filter((word) => word.length > 2).map((word) => word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word);
  }
  function properTokenSubset(a, b) {
    if (a.size === b.size) return false;
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    return [...small].every((word) => large.has(word));
  }
  function bigramCoverage(a, b) {
    const pairs = (words) => new Set(words.slice(0, -1).map((word, index) => `${word}\0${words[index + 1]}`));
    const aa = pairs(a);
    const bb = pairs(b);
    if (!aa.size || !bb.size) return 0;
    let intersection = 0;
    for (const pair of aa) if (bb.has(pair)) intersection++;
    return intersection / Math.max(aa.size, bb.size);
  }
  function titleSimilarity(a, b, relaxed = false) {
    if (!a || !b) return void 0;
    const aWords = titleTokens(a);
    const bWords = titleTokens(b);
    const aa = new Set(aWords);
    const bb = new Set(bWords);
    if (aa.size < 4 || bb.size < 4 || properTokenSubset(aa, bb)) return void 0;
    let intersection = 0;
    for (const word of aa) if (bb.has(word)) intersection++;
    if (intersection === aa.size && intersection === bb.size && normalizeTitle(a) !== normalizeTitle(b)) return void 0;
    if (relaxed && (aa.size - intersection > 1 || bb.size - intersection > 1)) return void 0;
    const leftCoverage = intersection / aa.size;
    const rightCoverage = intersection / bb.size;
    const jaccard = intersection / (aa.size + bb.size - intersection);
    const order = bigramCoverage(aWords, bWords);
    const minimum = relaxed ? { coverage: 0.8, jaccard: 0.65, order: 0.45 } : { coverage: 0.85, jaccard: 0.75, order: 0.55 };
    if (leftCoverage < minimum.coverage || rightCoverage < minimum.coverage || jaccard < minimum.jaccard || order < minimum.order) return void 0;
    return 0.3 * leftCoverage + 0.3 * rightCoverage + 0.25 * jaccard + 0.15 * order;
  }

  // src/core/CitationParser.ts
  var YEAR = /\b(19\d{2}|20\d{2})[a-z]?\b/i;
  var CITATION_MARKER = /^\s*(?:\[\s*(?=[^\]\n]{0,24}\d)[A-Za-z0-9][A-Za-z0-9+.:/_\-\s]{0,23}\s*\]|\d+[.)]|\d+(?=\s+(?:[A-ZÀ-ÖØ-Þ](?:\.|\s)|Technical\b)))\s*/u;
  var FULL_NAME_WORD = `(?:[A-Z\xC0-\xD6\xD8-\xDE][\\p{L}'\u2019-]+|[A-Z\xC0-\xD6\xD8-\xDE]\\.?)`;
  var FULL_NAME = `[A-Z\xC0-\xD6\xD8-\xDE][\\p{L}'\u2019-]+(?:\\s+${FULL_NAME_WORD}){1,4}`;
  var INITIALS_AUTHOR = `(?:[A-Z\xC0-\xD6\xD8-\xDE](?:-[A-Z\xC0-\xD6\xD8-\xDE])?\\.\\s*){1,5}(?:(?:de|del|den|der|di|du|la|le|van|von)\\s+){0,3}[A-Z\xC0-\xD6\xD8-\xDE][\\p{L}'\u2019-]+`;
  var COMMA_TITLE = new RegExp(`^(?:${INITIALS_AUTHOR}\\s*,\\s*)+(?:and\\s+${INITIALS_AUTHOR}\\s*,\\s*)?([^,]{12,240})\\s*,\\s*(?=[A-Z])`, "iu");
  var FULL_NAME_LIST = new RegExp(`^${FULL_NAME}(?:,\\s*${FULL_NAME})*(?:,?\\s+(?:and|&)\\s+${FULL_NAME})?$`, "u");
  var CONFERENCE_WORD = /\b(?:conference|workshop|symposium)\b|\bproc(?:eedings)?\.?(?=\s|,|$)/i;
  var CONFERENCE_ACRONYM_AFTER_IN = /\bin\s+(?:the\s+)?(?:proc(?:eedings)?\.?\s+(?:of\s+)?(?:the\s+)?)?[A-Z][A-Z0-9&-]{2,}\b/;
  var CONFERENCE_ACRONYM_WITH_YEAR = /\b[A-Z][A-Z0-9&/-]{2,}\s+(?:19|20)\d{2}[a-z]?\b/;
  var BOOK_SECTION_CONTEXT = /\b(?:chapter|isbn)\b|\b(?:ed|eds|editor|editors)\.?\s*(?:[,;)]|$)|\b(?:academic\s+press|university\s+press|springer|elsevier|wiley|routledge|sage|palgrave|crc\s+press)\b/i;
  var CitationParser = class {
    parse(reference) {
      const raw = reference.raw.replace(/[´`^¨]\s*/g, "").replace(/\s+/g, " ").trim();
      const yearMatch = raw.match(YEAR);
      const journal = this.extractJournalMetadata(raw, yearMatch);
      const title = journal?.titleless ? void 0 : this.extractTitle(raw, yearMatch?.index);
      const containerTitle = journal?.containerTitle || this.extractContainerTitle(raw, title);
      return {
        raw,
        doi: normalizeDOI(raw),
        arxiv: normalizeArxiv(raw),
        title,
        normalizedTitle: title ? normalizeTitle(title) : void 0,
        containerTitle,
        normalizedContainerTitle: containerTitle ? normalizeContainerTitle(containerTitle) : void 0,
        year: yearMatch ? Number(yearMatch[1]) : void 0,
        firstAuthor: this.extractFirstAuthor(raw) || reference.firstAuthorHint,
        volume: journal?.volume,
        issue: journal?.issue,
        pages: journal?.pages,
        articleNumber: journal?.articleNumber,
        itemTypeHint: this.itemTypeHint(raw, title, containerTitle)
      };
    }
    extractFirstAuthor(raw) {
      const citation = raw.replace(CITATION_MARKER, "");
      const vancouver = citation.match(/^([A-ZÀ-ÖØ-Þ][\p{L}'’-]+)\s+[A-Z]{1,4}(?=\s*[,;.])/u);
      if (vancouver?.[1]) return surname(vancouver[1]);
      const surnameFirst = citation.match(/^((?:(?:[Dd]e|[Dd]el|[Dd]en|[Dd]er|[Dd]i|[Dd]u|[Ll]a|[Ll]e|[Vv]an|[Vv]on)\s+){0,3}[A-ZÀ-ÖØ-Þ][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'’-]+){0,2})\s*,/u);
      if (surnameFirst?.[1]) return surname(surnameFirst[1]);
      const organization = citation.match(/^([^,]{1,80}\b(?:Collaboration|Partnership)\b)/i);
      if (organization?.[1]) return surname(organization[1]);
      const initialsFirst = citation.match(/^(?:[A-ZÀ-ÖØ-Þ](?:[-.\s]+)){1,4}([A-ZÀ-ÖØ-Þ][\p{L}'’-]+)/u);
      if (initialsFirst?.[1]) return surname(initialsFirst[1]);
      const etAl = citation.match(/^([A-ZÀ-ÖØ-Þ][\p{L}'’-]+)\s+et\s+al\b/u);
      if (etAl?.[1]) return surname(etAl[1]);
      const fullNameFirst = citation.match(new RegExp(`^(${FULL_NAME})\\s*,`, "u"));
      if (fullNameFirst?.[1]) return surname(fullNameFirst[1]);
      const fullNameBeforeAnd = citation.match(new RegExp(`^(${FULL_NAME})\\s+(?:and|&)\\s+`, "u"));
      if (fullNameBeforeAnd?.[1]) return surname(fullNameBeforeAnd[1]);
      if (CITATION_MARKER.test(raw)) {
        const fullNameBeforePeriod = citation.match(new RegExp(`^(${FULL_NAME})\\.\\s+`, "u"));
        if (fullNameBeforePeriod?.[1]) return surname(fullNameBeforePeriod[1]);
      }
      return void 0;
    }
    extractTitle(raw, yearIndex) {
      const quoted = raw.match(/[“\"]([^”\"]{12,300})[”\"]/);
      if (quoted?.[1]) return this.clean(quoted[1]);
      const citation = raw.replace(CITATION_MARKER, "");
      const mathematicalTitle = this.extractCommaDelimitedTitle(citation);
      if (mathematicalTitle) return mathematicalTitle;
      const commaTitle = citation.match(COMMA_TITLE);
      if (commaTitle?.[1] && commaTitle[1].split(/\s+/).length >= 3) return this.clean(commaTitle[1]);
      const afterAuthors = this.extractAfterAuthors(citation);
      if (afterAuthors) return afterAuthors;
      const protectedCitation = citation.replace(/\b([A-Z])\.\s*/g, "$1\0");
      const segments = protectedCitation.split(/\.\s+(?=[A-Z\d])/).map((value) => this.clean(value.replace(/\u0000/g, ". "))).filter(Boolean);
      const candidate = segments.find((segment, index) => {
        const words = segment.split(/\s+/).length;
        if (words < 3 || words > 40 || /^(doi|arxiv|vol|pp|https?|in\s+(proceedings|proc\.|conference|journal))/i.test(segment)) return false;
        if (index === 0 && this.looksLikeAuthors(segment)) return false;
        return !/^\(?\s*(?:19|20)\d{2}[a-z]?\s*\)?$/i.test(segment);
      });
      if (candidate) return candidate;
      const afterYear = yearIndex == null ? citation : citation.slice(yearIndex).replace(YEAR, "");
      const commaSegments = afterYear.split(/,\s+/).map(this.clean).filter(Boolean);
      return commaSegments.find((segment) => segment.split(/\s+/).length >= 4);
    }
    extractCommaDelimitedTitle(citation) {
      const parts = citation.split(/\s*,\s*/).map((value) => value.trim()).filter(Boolean);
      let authorEnd = 0;
      while (authorEnd < parts.length && this.looksLikeInitialsAuthorSegment(parts[authorEnd])) authorEnd++;
      if (!authorEnd) return void 0;
      const venueIndex = parts.findIndex((value, index) => index > authorEnd && /\.\s*[A-Za-z]?\d+\s*(?:\(|$)/.test(value));
      if (venueIndex <= authorEnd) return void 0;
      const candidate = this.clean(parts.slice(authorEnd, venueIndex).join(", "));
      return candidate.split(/\s+/).length >= 3 ? candidate : void 0;
    }
    looksLikeInitialsAuthorSegment(value) {
      return value.replace(/^and\s+/i, "").split(/\s+(?:and|&)\s+/i).every(
        (author) => /^(?:[A-ZÀ-ÖØ-Þ]\.(?:-[A-ZÀ-ÖØ-Þ]\.)?\s*){1,5}(?:(?:de|del|den|der|di|du|la|le|van|von)\s+){0,3}[A-ZÀ-ÖØ-Þ][\p{L}'’-]+$/iu.test(author.trim())
      );
    }
    extractJournalMetadata(raw, yearMatch) {
      if (!yearMatch || yearMatch.index == null) return void 0;
      const citation = raw.replace(CITATION_MARKER, "");
      const adjustedYearIndex = Math.max(0, yearMatch.index - (raw.length - citation.length));
      const authorArea = citation.slice(0, adjustedYearIndex).replace(/[,(\s.]+$/g, "");
      const afterYear = citation.slice(adjustedYearIndex).match(
        /^(?:19\d{2}|20\d{2})[a-z]?\)?\s*,\s*([^,]{2,100}),\s*(?:vol\.?\s*)?([A-Za-z]?\d+[A-Za-z]?)(?:\s*\((\d+)\))?\s*,\s*(?:pp?\.?\s*)?([A-Za-z]?\d+(?:[-–—][A-Za-z]?\d+)?)\b/i
      );
      if (afterYear && (this.looksLikeAuthors(authorArea) || /\b(?:Collaboration|Partnership)\b/i.test(authorArea) || /^[—–-]/.test(authorArea))) {
        const locator2 = normalizeLocator(afterYear[4]);
        return {
          containerTitle: this.clean(afterYear[1]),
          volume: normalizeVolume(afterYear[2]),
          issue: afterYear[3],
          pages: afterYear[4],
          articleNumber: locator2 && /^[a-z]/i.test(locator2) ? locator2.toUpperCase() : void 0,
          titleless: true
        };
      }
      const beforeYear = citation.slice(0, adjustedYearIndex);
      const yearLast = beforeYear.match(/,\s*([^,]{2,80}?)\s*,?\s+([A-Za-z]?\d+[A-Za-z]?)\s*,\s*([A-Za-z]?\d+(?:[-–—][A-Za-z]?\d+)?)\s*\($/i);
      if (!yearLast) return void 0;
      const authors = beforeYear.slice(0, yearLast.index);
      if (!this.looksLikeInitialsAuthorList(authors)) return void 0;
      const locator = normalizeLocator(yearLast[3]);
      return {
        containerTitle: this.clean(yearLast[1]),
        volume: normalizeVolume(yearLast[2]),
        pages: yearLast[3],
        articleNumber: locator && /^[a-z]/i.test(locator) ? locator.toUpperCase() : void 0,
        titleless: true
      };
    }
    looksLikeInitialsAuthorList(value) {
      const authors = value.replace(/,?\s+(?:and|&)\s+/gi, ", ").split(/\s*,\s*/).filter(Boolean);
      return authors.length > 0 && authors.every(
        (author) => /^(?:[A-ZÀ-ÖØ-Þ](?:-[A-ZÀ-ÖØ-Þ])?\.\s*){1,5}(?:(?:de|del|den|der|di|du|la|le|van|von)\s+){0,3}[A-ZÀ-ÖØ-Þ][\p{L}'’-]+$/iu.test(author)
      );
    }
    extractAfterAuthors(citation) {
      for (const boundary of citation.matchAll(/\.\s+(?=[A-ZÀ-ÖØ-Þ\d])/gu)) {
        const prefix = citation.slice(0, boundary.index);
        const remainder = citation.slice(boundary.index + boundary[0].length);
        if (/\b[A-ZÀ-ÖØ-Þ]\s*$/u.test(prefix) && /^[A-ZÀ-ÖØ-Þ][\p{L}'’-]+(?:\s*,|\s+(?:and|&)\b)/u.test(remainder)) continue;
        if (!this.looksLikeAuthors(prefix)) continue;
        const segments = remainder.split(/\.\s+(?=[A-ZÀ-ÖØ-Þ\d]|arXiv\b|doi\b|https?:)/u);
        let title = segments[0] || "";
        if (/:\s*[IVXLCDM]+$/i.test(title) && segments[1]) title += `. ${segments[1]}`;
        const candidate = this.clean(title);
        const words = candidate.split(/\s+/).filter(Boolean).length;
        if (words < 2 || words > 40 || words === 2 && normalizeTitle(candidate).length < 12 || this.looksLikeAuthors(candidate)) continue;
        if (/^(?:[A-ZÀ-ÖØ-Þ]\.\s*|\(?\s*(?:19|20)\d{2})/u.test(candidate)) continue;
        if (/\b(?:and|&)\s+[A-ZÀ-ÖØ-Þ]\.?$/u.test(candidate)) continue;
        return candidate;
      }
      return void 0;
    }
    extractContainerTitle(raw, title) {
      const titleIndex = title ? raw.toLowerCase().indexOf(title.toLowerCase()) : -1;
      const searchFrom = titleIndex >= 0 && title ? titleIndex + title.length : 0;
      const remainder = raw.slice(searchFrom);
      const match = remainder.match(/(?:^|[,.;][”"]?)\s*[Ii]n\s*:?[\s]+(.{3,180}?)(?=,\s*(?:pp?\.?|vol\.?|no\.?|(?:19|20)\d{2})|\.\s*(?:doi|https?)|$)/);
      if (!match?.[1]) return void 0;
      const value = this.clean(match[1].replace(/^(?:[^,]{1,80}\b(?:ed|eds|editor|editors)\.?\s*,\s*)/i, "").replace(/\s*\((?:pp?\.?|pages?)\s*[^)]+\)\s*$/i, ""));
      return value.split(/,\s*(?=[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)*\s*$)/u)[0] || void 0;
    }
    itemTypeHint(raw, title, containerTitle) {
      if (containerTitle) {
        if (CONFERENCE_WORD.test(containerTitle) || CONFERENCE_WORD.test(raw) || CONFERENCE_ACRONYM_AFTER_IN.test(raw) || CONFERENCE_ACRONYM_WITH_YEAR.test(containerTitle)) {
          return "conferencePaper";
        }
        if (BOOK_SECTION_CONTEXT.test(raw)) return "bookSection";
      }
      if (!containerTitle && /\b(?:edition|publisher|press|isbn)\b/i.test(raw)) return "book";
      if (title && /\b(?:vol\.?|issue|journal)\b/i.test(raw)) return "journalArticle";
      return void 0;
    }
    looksLikeAuthors(value) {
      return /\bet\s+al\b/i.test(value) || /(?:^|,\s*)[A-ZÀ-ÖØ-Þ][\p{L}'’-]+,?\s+[A-Z](?:\.|\b)/u.test(value) || /^(?:[A-Z]\.\s*){1,3}[\p{L}'’-]+(?:\s+(?:and|&)\s+(?:[A-Z]\.\s*){1,3}[\p{L}'’-]+)?$/u.test(value) || FULL_NAME_LIST.test(value) || (value.match(/,/g)?.length || 0) >= 2;
    }
    clean(value) {
      return value.replace(/^[:;,.\s]+|[.;,\s]+$/g, "").trim();
    }
  };

  // src/core/LibraryMatcher.ts
  var LibraryMatcher = class {
    constructor(zotero) {
      this.zotero = zotero;
    }
    byDOI = /* @__PURE__ */ new Map();
    byArxiv = /* @__PURE__ */ new Map();
    byTitle = /* @__PURE__ */ new Map();
    byCompactTitle = /* @__PURE__ */ new Map();
    byToken = /* @__PURE__ */ new Map();
    byAuthorYear = /* @__PURE__ */ new Map();
    async index(libraryID) {
      const items = await this.zotero.Items.getAll(libraryID, true, false);
      this.byDOI.clear();
      this.byArxiv.clear();
      this.byTitle.clear();
      this.byCompactTitle.clear();
      this.byToken.clear();
      this.byAuthorYear.clear();
      for (const item of items) {
        if (!item.isRegularItem()) continue;
        const title = this.field(item, "title");
        if (!title) continue;
        const extra = this.field(item, "extra");
        const creators = item.getCreators();
        const containerTitle = this.field(item, "bookTitle") || this.field(item, "proceedingsTitle") || this.field(item, "publicationTitle") || void 0;
        const pdfAttachmentID = item.getAttachments().find((id) => {
          const attachment = this.zotero.Items.get(id);
          return attachment && attachment.attachmentContentType === "application/pdf";
        });
        const record = {
          item,
          title,
          normalizedTitle: normalizeTitle(title),
          containerTitle,
          normalizedContainerTitle: containerTitle ? normalizeContainerTitle(containerTitle) : void 0,
          doi: normalizeDOI(this.field(item, "DOI") || extra),
          arxiv: normalizeArxiv(`${extra} ${this.field(item, "url")}`),
          year: this.year(this.field(item, "date")),
          firstAuthor: surname(creators[0]?.lastName || creators[0]?.name),
          volume: normalizeVolume(this.field(item, "volume")),
          issue: this.field(item, "issue") || void 0,
          pages: this.field(item, "pages") || void 0,
          articleNumber: this.field(item, "articleNumber") || void 0,
          itemType: this.itemType(item),
          pdfAttachmentID
        };
        for (const token of new Set(this.tokens(record.normalizedTitle))) {
          const records = this.byToken.get(token) || /* @__PURE__ */ new Set();
          records.add(record);
          this.byToken.set(token, records);
        }
        if (record.doi) this.add(this.byDOI, record.doi, record);
        if (record.arxiv) this.add(this.byArxiv, record.arxiv, record);
        this.add(this.byTitle, record.normalizedTitle, record);
        this.add(this.byCompactTitle, this.compact(record.normalizedTitle), record);
        if (record.firstAuthor && record.year) this.add(this.byAuthorYear, this.authorYearKey(record.firstAuthor, record.year), record);
      }
    }
    match(citation) {
      return this.matchWithOutcome(citation).match;
    }
    matchWithOutcome(citation) {
      if (citation.doi) {
        const record = this.preferredIdentifierRecord(this.byDOI.get(citation.doi) || [], citation);
        if (record) return { match: { record, method: "doi", score: 1 }, ambiguous: false };
      }
      if (citation.arxiv) {
        const record = this.preferredIdentifierRecord(this.byArxiv.get(citation.arxiv) || [], citation);
        if (record) return { match: { record, method: "arxiv", score: 1 }, ambiguous: false };
      }
      const bibliographic = this.matchBibliographic(citation);
      if (bibliographic) return bibliographic;
      if (!citation.normalizedTitle || citation.normalizedTitle.length < 12) return { ambiguous: false };
      const exact = (this.byTitle.get(citation.normalizedTitle) || []).map((record) => this.scoreCandidate(record, citation, true)).filter((candidate) => Boolean(candidate));
      if (exact.length) return this.resolve(exact, "title-exact");
      const compactExact = (this.byCompactTitle.get(this.compact(citation.normalizedTitle)) || []).filter((record) => record.normalizedTitle !== citation.normalizedTitle).map((record) => this.scoreCandidate(record, citation, true)).filter((candidate) => Boolean(candidate));
      if (compactExact.length) return this.resolve(compactExact, "title-exact");
      const records = /* @__PURE__ */ new Set();
      for (const token of this.tokens(citation.normalizedTitle)) {
        for (const record of this.byToken.get(token) || []) records.add(record);
      }
      const fuzzy = [...records].filter((record) => record.normalizedTitle !== citation.normalizedTitle).map((record) => this.scoreCandidate(record, citation, false)).filter((candidate) => Boolean(candidate));
      return this.resolve(fuzzy, "title-fuzzy") || { ambiguous: false };
    }
    matchBibliographic(citation) {
      if (citation.normalizedTitle || !citation.firstAuthor || !citation.year) return void 0;
      const candidates = this.byAuthorYear.get(this.authorYearKey(citation.firstAuthor, citation.year)) || [];
      const scored = candidates.flatMap((record) => {
        let matches = 0;
        let score = 0.45;
        const citationLocator = normalizeLocator(citation.articleNumber || citation.pages);
        const recordLocator = normalizeLocator(record.articleNumber || record.pages);
        if (citation.normalizedContainerTitle && record.normalizedContainerTitle) {
          if (citation.normalizedContainerTitle !== record.normalizedContainerTitle) return [];
          matches++;
          score += 0.18;
        }
        if (citation.volume && record.volume) {
          if (normalizeVolume(citation.volume) !== normalizeVolume(record.volume)) return [];
          matches++;
          score += 0.16;
        }
        if (citationLocator && recordLocator) {
          if (citationLocator !== recordLocator) return [];
          matches++;
          score += 0.2;
        }
        const strongEnough = matches >= 2 && Boolean(citationLocator || citation.normalizedContainerTitle && citation.volume);
        return strongEnough ? [{ record, exact: true, score }] : [];
      });
      return this.resolve(scored, "bibliographic");
    }
    scoreCandidate(record, citation, exact) {
      const metadata = this.checkMetadata(record, citation);
      if (!metadata) return void 0;
      let titleScore = 1;
      if (!exact) {
        titleScore = titleSimilarity(citation.normalizedTitle, record.normalizedTitle) || 0;
        if (!titleScore && metadata.authorMatch && metadata.yearMatch) {
          titleScore = titleSimilarity(citation.normalizedTitle, record.normalizedTitle, true) || 0;
        }
        if (!titleScore) return void 0;
        if (!metadata.authorMatch && !metadata.yearMatch && !metadata.containerMatch && !metadata.itemTypeMatch) return void 0;
      }
      return {
        record,
        exact,
        score: titleScore + Number(metadata.authorMatch) * 0.08 + Number(metadata.yearMatch) * 0.04 + Number(metadata.containerMatch) * 0.05 + Number(metadata.itemTypeMatch) * 0.03
      };
    }
    checkMetadata(record, citation) {
      const authorMatch = Boolean(citation.firstAuthor && record.firstAuthor && citation.firstAuthor === record.firstAuthor);
      if (citation.firstAuthor && record.firstAuthor && !authorMatch) return void 0;
      const yearMatch = Boolean(citation.year && record.year && citation.year === record.year);
      if (citation.year && record.year && Math.abs(citation.year - record.year) > 1) return void 0;
      const itemTypeMatch = Boolean(citation.itemTypeHint && record.itemType && citation.itemTypeHint === record.itemType);
      let containerMatch = false;
      if (citation.normalizedContainerTitle && record.normalizedContainerTitle) {
        containerMatch = citation.normalizedContainerTitle === record.normalizedContainerTitle || titleSimilarity(citation.normalizedContainerTitle, record.normalizedContainerTitle) != null;
        if (citation.itemTypeHint === "bookSection" && record.itemType === "bookSection" && !containerMatch) return void 0;
      }
      return { authorMatch, yearMatch, containerMatch, itemTypeMatch };
    }
    resolve(candidates, method) {
      candidates.sort((a, b) => b.score - a.score || a.record.item.id - b.record.item.id);
      let first = candidates[0];
      if (!first) return void 0;
      const second = candidates[1];
      if (second && first.score - second.score < 0.06) {
        const tied = candidates.filter((candidate) => first.score - candidate.score < 0.06);
        const sameDOI = first.record.doi && tied.every((candidate) => candidate.record.doi === first.record.doi);
        const sameArxiv = first.record.arxiv && tied.every((candidate) => candidate.record.arxiv === first.record.arxiv);
        if (!sameDOI && !sameArxiv) return { ambiguous: true };
        first = tied.sort(
          (a, b) => Number(Boolean(b.record.pdfAttachmentID)) - Number(Boolean(a.record.pdfAttachmentID)) || a.record.item.id - b.record.item.id
        )[0];
      }
      return { match: { record: first.record, method, score: Math.min(first.score, 0.99) }, ambiguous: false };
    }
    preferredIdentifierRecord(records, citation) {
      return [...records].sort((a, b) => {
        const pdf = Number(Boolean(b.pdfAttachmentID)) - Number(Boolean(a.pdfAttachmentID));
        if (pdf) return pdf;
        const metadata = this.identifierMetadataScore(b, citation) - this.identifierMetadataScore(a, citation);
        return metadata || a.item.id - b.item.id;
      })[0];
    }
    identifierMetadataScore(record, citation) {
      return Number(Boolean(citation.firstAuthor && record.firstAuthor === citation.firstAuthor)) + Number(Boolean(citation.year && record.year === citation.year));
    }
    itemType(item) {
      try {
        return this.zotero.ItemTypes?.getName(item.itemTypeID) || (this.field(item, "bookTitle") ? "bookSection" : void 0);
      } catch {
        return this.field(item, "bookTitle") ? "bookSection" : void 0;
      }
    }
    field(item, name) {
      try {
        return item.getField(name) || "";
      } catch {
        return "";
      }
    }
    tokens(value) {
      return value.split(" ").filter((word) => word.length > 2);
    }
    compact(value) {
      return value.replace(/\s+/g, "");
    }
    add(map, key, record) {
      const records = map.get(key) || [];
      records.push(record);
      map.set(key, records);
    }
    authorYearKey(author, year) {
      return `${author}\0${year}`;
    }
    year(value) {
      const match = value.match(/\b(19\d{2}|20\d{2})\b/);
      return match ? Number(match[1]) : void 0;
    }
  };

  // src/core/PdfSectionExtractor.ts
  var REFERENCE_HEADING = /^\s*(?:\d{1,4}\s+)?(references|bibliography|works cited|literature cited|references cited)(?:\s+\d{1,4})?\s*$/i;
  var STOP_HEADING = /^\s*(?:\d{1,4}\s+)?(appendix|appendices|supplementary material|supplemental material|acknowledg(?:e)?ments?)(?:\s+\d{1,4})?\b/i;
  var ACKNOWLEDGEMENT_HEADING = /^\s*(?:\d{1,4}\s+)?acknowledg(?:e)?ments?(?:\s+\d{1,4})?\s*$/i;
  var LETTERED_STOP_HEADING = /^\s*A(?:\.\d+)?(?:\.\s*|\s+)(?=[\p{Lu}])[^,.;]{2,100}\s*$/u;
  var LABELED_START = new RegExp("(?:^|\\n)\\s*(?:\\[\\s*((?=[^\\]\\n]{0,24}\\d)[A-Za-z0-9][A-Za-z0-9+.:/_\\-\\s]{0,23})\\s*\\]|((?!(?:18|19|20|21)\\d{2}\\b)\\d{1,4})[.)]|((?!(?:18|19|20|21)\\d{2}\\b)\\d{1,4})(?=\\s+(?:[A-Z\xC0-\xD6\xD8-\xDE](?:\\.|\\s)|Technical\\b)))(?:\\s+|(?=\\p{Lu}))", "gu");
  var PARTICLE = `(?:[Dd]e|[Dd]el|[Dd]en|[Dd]er|[Dd]i|[Dd]u|[Ll]a|[Ll]e|[Vv]an|[Vv]on)\\s+`;
  var SURNAME = `(?:${PARTICLE}){0,3}[A-Z\xC0-\xD6\xD8-\xDE][\\p{L}'\u2019-]+(?:\\s+[A-Z\xC0-\xD6\xD8-\xDE][\\p{L}'\u2019-]+){0,2}`;
  var INITIALS = `(?:[A-Z](?:\\.-[A-Z])?\\.(?:\\s*[A-Z](?:\\.-[A-Z])?\\.){0,5}|[A-Z](?:-[A-Z])?(?=\\s*[,;]))`;
  var INITIALS_FIRST = `(?:[A-Z](?:-[A-Z])?\\.\\s*){1,5}`;
  var AUTHOR_START = new RegExp(
    `(?:^|\\n)(?=\\s*(?:${SURNAME},\\s*${INITIALS}|${SURNAME}\\s+[A-Z](?:-[A-Z])?(?=\\s*[,;])|${INITIALS_FIRST}${SURNAME}(?=\\s*[,;])))`,
    "gu"
  );
  var ORGANIZATION_START = /(?:^|\n)(?=\s*[A-Z][^\n,]{1,80}\b(?:Collaboration|Partnership)\b[^\n]*\b(?:19|20)\d{2}[a-z]?\b)/gu;
  var DITTO_START = /(?:^|\n)(?=\s*[—–-]\.\s*(?:19|20)\d{2}[a-z]?\b)/gu;
  var DISCRETIONARY_HYPHEN = /[-\u00ad\u0002]\s*$/;
  var CONTINUATION_LINE = "";
  var PDF_DIACRITIC_ARTIFACT = /[´`^¨]\s*/g;
  var SPLIT_HEADING_WORDS = [
    "references",
    "bibliography",
    "appendix",
    "appendices",
    "supplementary",
    "supplemental",
    "material",
    "acknowledgement",
    "acknowledgements",
    "acknowledgment",
    "acknowledgments"
  ].map((word) => ({ word, pattern: new RegExp(`\\b${word.split("").join("\\s*")}\\b`, "gi") }));
  var PdfSectionExtractor = class {
    async extract(pdf) {
      const structured = await this.fromOutline(pdf);
      if (structured) {
        const section2 = await this.extractRange(pdf, structured.startPage, structured.endPage, "zotero-structure", void 0, void 0, structured.startHeading, structured.endHeading);
        section2.startHeading = structured.startHeading;
        section2.endHeading = structured.endHeading;
        return section2;
      }
      const scanned = await this.findByHeadings(pdf);
      if (!scanned) {
        const headingless = await this.findByNumberedReferences(pdf);
        if (!headingless) return void 0;
        return this.extractRange(pdf, headingless.startPage, pdf.numPages - 1, "heading-scan", headingless.startLine);
      }
      const section = await this.extractRange(pdf, scanned.startPage, scanned.endPage, "heading-scan", scanned.startLine, scanned.endLine);
      section.startHeading = "References";
      return section;
    }
    async fromOutline(pdf) {
      if (!pdf.getOutline2) return void 0;
      try {
        const outline = await pdf.getOutline2();
        const flat = this.flatten(outline || []);
        const refIndex = flat.findIndex((entry) => REFERENCE_HEADING.test(entry.title));
        if (refIndex < 0) return void 0;
        const ref = flat[refIndex];
        const next = flat.slice(refIndex + 1).find((entry) => entry.depth <= ref.depth && entry.page > ref.page);
        return { startPage: ref.page, endPage: next ? next.page : pdf.numPages - 1, startHeading: ref.title, endHeading: next?.title };
      } catch {
        return void 0;
      }
    }
    flatten(items, depth = 0) {
      const result = [];
      for (const item of items) {
        const page = item.location?.position?.pageIndex;
        if (item.title && page != null) result.push({ title: item.title.trim(), page, depth });
        result.push(...this.flatten(item.items || [], depth + 1));
      }
      return result;
    }
    async findByHeadings(pdf) {
      let found;
      for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
        const lines = await this.pageLines(pdf, pageIndex);
        if (!found) {
          const startLine = lines.findIndex((line) => REFERENCE_HEADING.test(this.visibleLine(line)));
          if (startLine >= 0) found = { startPage: pageIndex, startLine: startLine + 1 };
          continue;
        }
        const stopLine = lines.findIndex((line) => this.isStopHeading(line));
        if (stopLine >= 0) return { ...found, endPage: pageIndex, endLine: stopLine };
      }
      return found ? { ...found, endPage: pdf.numPages - 1 } : void 0;
    }
    async findByNumberedReferences(pdf) {
      for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
        const lines = await this.pageLines(pdf, pageIndex);
        for (let startLine = 0; startLine < lines.length; startLine++) {
          if (!/^\s*(?:\[\s*1\s*\]|1[.)]?)(?=\s+(?:[A-ZÀ-ÖØ-Þ](?:\.|\s)|Technical\b))/u.test(this.visibleLine(lines[startLine]))) continue;
          const samplePages = [lines.slice(startLine).join("\n")];
          for (let nextPage = pageIndex + 1; nextPage < Math.min(pdf.numPages, pageIndex + 3); nextPage++) {
            samplePages.push((await this.pageLines(pdf, nextPage)).join("\n"));
          }
          const references = this.splitReferences(samplePages.join("\n"));
          if (references.length < 5) continue;
          const firstFive = references.slice(0, 5);
          if (firstFive.every((reference, index) => reference.index === index + 1) && firstFive.filter((reference) => /\b(?:18|19|20|21)\d{2}\b/.test(reference.raw)).length >= 3) {
            return { startPage: pageIndex, startLine };
          }
        }
      }
      return void 0;
    }
    async extractRange(pdf, startPage, endPage, source, startLine = 0, endLine, startHeading, endHeading) {
      const pages = [];
      let detectedEndPage = endPage;
      for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
        let lines = await this.pageLines(pdf, pageIndex);
        if (pageIndex === startPage && startHeading) {
          const headingLine = lines.findIndex((line) => this.sameHeading(line, startHeading));
          if (headingLine >= 0) startLine = headingLine + 1;
        }
        if (pageIndex === endPage && endHeading) {
          const headingLine = lines.findIndex((line) => this.sameHeading(line, endHeading));
          if (headingLine >= 0) endLine = headingLine;
        }
        if (pageIndex === startPage) lines = lines.slice(startLine);
        if (pageIndex === endPage && endLine != null) lines = lines.slice(0, endLine);
        const reorderedAcknowledgement = pageIndex === startPage ? lines.findIndex((line) => ACKNOWLEDGEMENT_HEADING.test(this.visibleLine(line))) : -1;
        if (reorderedAcknowledgement >= 0) {
          pages.push(lines.slice(0, reorderedAcknowledgement).join("\n"));
          continue;
        }
        const stopLine = lines.findIndex((line) => this.isStopHeading(line));
        if (stopLine >= 0) {
          lines = lines.slice(0, stopLine);
          detectedEndPage = pageIndex;
          if (lines.length) pages.push(lines.join("\n"));
          break;
        }
        pages.push(lines.join("\n"));
      }
      return { startPage, endPage: detectedEndPage, references: this.splitReferences(pages.join("\n")), source };
    }
    sameHeading(a, b) {
      const normalize = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      return normalize(this.visibleLine(a)) === normalize(this.visibleLine(b));
    }
    isStopHeading(line) {
      const visible = this.visibleLine(line);
      return STOP_HEADING.test(visible) || LETTERED_STOP_HEADING.test(visible);
    }
    visibleLine(line) {
      let visible = line.replaceAll(CONTINUATION_LINE, "");
      for (const { word, pattern } of SPLIT_HEADING_WORDS) {
        visible = visible.replace(pattern, word);
      }
      return visible;
    }
    async pageLines(pdf, pageIndex) {
      const wrappedPage = await pdf.getPage(pageIndex + 1);
      const page = this.unwrap(wrappedPage);
      if (typeof page.getTextContent !== "function") {
        throw new Error(`参照リンク: PDF page ${pageIndex + 1} does not expose getTextContent()`);
      }
      const content = await page.getTextContent();
      const lines = [];
      let line = "";
      let lineX;
      let lineY;
      let continued = "";
      let continuedX;
      let continuedY;
      const flushLine = () => {
        const value = line.trim();
        if (DISCRETIONARY_HYPHEN.test(value)) {
          if (!continued) {
            continuedX = lineX;
            continuedY = lineY;
          }
          continued += value.replace(DISCRETIONARY_HYPHEN, "");
        } else if (value) {
          lines.push({ text: `${continued}${value}`.replace(PDF_DIACRITIC_ARTIFACT, "").trim(), x: continuedX ?? lineX, y: continuedY ?? lineY, order: lines.length });
          continued = "";
          continuedX = void 0;
          continuedY = void 0;
        }
        line = "";
        lineX = void 0;
        lineY = void 0;
      };
      for (const item of content.items) {
        if (item.str) {
          const itemY = typeof item.transform?.[5] === "number" ? item.transform[5] : void 0;
          if (line && lineY != null && itemY != null && Math.abs(itemY - lineY) > 4) flushLine();
          if (!line) {
            lineX = typeof item.transform?.[4] === "number" ? item.transform[4] : void 0;
            lineY = itemY;
          }
          line += (line && !/[-–—\s]$/.test(line) ? " " : "") + item.str;
        }
        if (item.hasEOL) flushLine();
      }
      if (line.trim()) flushLine();
      else if (continued) lines.push({ text: continued.replace(PDF_DIACRITIC_ARTIFACT, "").trim(), x: continuedX, y: continuedY, order: lines.length });
      const positionCounts = /* @__PURE__ */ new Map();
      for (const value of lines) {
        if (value.x == null) continue;
        const position = Math.round(value.x);
        positionCounts.set(position, (positionCounts.get(position) || 0) + 1);
      }
      const recurringPositions = [...positionCounts].filter(([, count]) => count >= 2).map(([position]) => position);
      const numberedLines = lines.map((value) => Number(value.text.match(/\s(\d{1,4})$/)?.[1] || NaN));
      let sequentialRun = 0;
      let longestSequentialRun = 0;
      for (let i = 1; i < numberedLines.length; i++) {
        sequentialRun = Number.isFinite(numberedLines[i - 1]) && numberedLines[i] === numberedLines[i - 1] + 1 ? sequentialRun + 1 : 0;
        longestSequentialRun = Math.max(longestSequentialRun, sequentialRun);
      }
      if (longestSequentialRun >= 3) {
        for (const value of lines) value.text = value.text.replace(/\s+\d{1,4}$/, "");
      }
      const columnBases = recurringPositions.sort((a, b) => a - b).filter((position) => !recurringPositions.some((other) => position > other && position - other <= 32));
      const columnLines = columnBases.map(() => []);
      for (const value of lines) {
        if (value.x == null || value.y == null || !columnBases.length) continue;
        let best = 0;
        for (let i = 1; i < columnBases.length; i++) {
          if (Math.abs(value.x - columnBases[i]) < Math.abs(value.x - columnBases[best])) best = i;
        }
        columnLines[best].push(value.y);
      }
      const alignedColumns = columnLines.some((left, leftIndex) => columnLines.some((right, rightIndex) => {
        if (rightIndex <= leftIndex || columnBases[rightIndex] - columnBases[leftIndex] < 100) return false;
        let aligned = 0;
        for (const y of left) {
          if (right.some((otherY) => Math.abs(y - otherY) <= 20)) aligned++;
        }
        return aligned >= 2;
      }));
      const hasColumns = columnBases.length >= 2 && alignedColumns;
      const ordered = hasColumns ? (() => {
        const nearestColumn = (value) => {
          if (value.x == null) return 0;
          let best = 0;
          for (let i = 1; i < columnBases.length; i++) {
            if (Math.abs(value.x - columnBases[i]) < Math.abs(value.x - columnBases[best])) best = i;
          }
          return best;
        };
        const headingIndex = lines.findIndex((value) => REFERENCE_HEADING.test(this.visibleLine(value.text)));
        const firstLabeledAfterHeading = headingIndex >= 0 ? lines.slice(headingIndex + 1).find(
          (value) => new RegExp("^\\s*(?:\\[\\s*[A-Za-z0-9][^\\]]{0,24}\\]|\\d{1,4}[.)])(?:\\s+|(?=\\p{Lu}))", "u").test(value.text)
        ) : void 0;
        const referenceColumn = firstLabeledAfterHeading ? nearestColumn(firstLabeledAfterHeading) : 0;
        const column = (value) => REFERENCE_HEADING.test(this.visibleLine(value.text)) ? referenceColumn : nearestColumn(value);
        return [...lines].sort((a, b) => {
          const columnDifference = column(a) - column(b);
          if (columnDifference) return columnDifference;
          if (a.y != null && b.y != null && Math.abs(a.y - b.y) > 0.5) return b.y - a.y;
          return a.order - b.order;
        });
      })() : lines;
      return ordered.flatMap((value) => {
        let line2 = value.text;
        if (value.x != null) {
          const indented = columnBases.some((position) => value.x - position >= 5 && value.x - position <= 36);
          const labeled = new RegExp("^\\s*(?:\\[\\s*[A-Za-z0-9][^\\]]{0,24}\\]|\\d{1,4}[.)])(?:\\s+|(?=\\p{Lu}))", "u").test(value.text);
          if (indented && !labeled) line2 = `${CONTINUATION_LINE}${line2}`;
        }
        return this.splitInlineReferenceHeading(line2);
      });
    }
    splitInlineReferenceHeading(line) {
      const visible = this.visibleLine(line);
      const match = visible.match(/^\s*((?:\d{1,4}\s+)?(?:references cited|literature cited|works cited|references|bibliography)(?:\s+\d{1,4})?)\s+(.+)$/i);
      if (!match || !this.looksLikeReferenceStart(match[2])) return [line];
      return [match[1], match[2]];
    }
    looksLikeReferenceStart(value) {
      return /^\s*(?:\[\s*[A-Za-z0-9]|\d{1,4}[.)]|[A-ZÀ-ÖØ-Þ][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'’-]+){0,2}\s*,|[A-ZÀ-ÖØ-Þ][\p{L}'’-]+\s+[A-Z](?:-[A-Z])?\s*[,;]|[A-Z](?:-[A-Z])?\.\s*[A-ZÀ-ÖØ-Þ][\p{L}'’-]+)/u.test(value);
    }
    unwrap(value) {
      const privileged = globalThis;
      const withWrapper = value;
      return privileged.Cu?.waiveXrays?.(value) || withWrapper.wrappedJSObject || value;
    }
    splitReferences(text) {
      const starts = [...text.matchAll(LABELED_START)];
      const labeledStarts = this.plausibleLabeledStarts(starts);
      if (labeledStarts.length >= 2) {
        const final = labeledStarts.at(-1);
        const finalNumber = Number(this.label(final));
        const numberingReset = Number.isFinite(finalNumber) ? starts.find((match) => {
          if (match.index <= final.index) return false;
          const label = this.label(match);
          const value = /^\d+$/.test(label) ? Number(label) : void 0;
          return value != null && value <= finalNumber;
        }) : void 0;
        return labeledStarts.map((match, i) => ({
          raw: this.visibleLine(text.slice(match.index, labeledStarts[i + 1]?.index ?? numberingReset?.index ?? text.length)).trim(),
          fragments: [],
          index: /^\d+$/.test(this.label(match)) ? Number(this.label(match)) : void 0
        })).filter((block) => block.raw.length >= 20);
      }
      const indices = [.../* @__PURE__ */ new Set([
        ...[...text.matchAll(AUTHOR_START)].map((match) => match.index),
        ...[...text.matchAll(ORGANIZATION_START)].map((match) => match.index),
        ...[...text.matchAll(DITTO_START)].map((match) => match.index)
      ])].sort((a, b) => a - b);
      let previousAuthor;
      return indices.map((start, i) => {
        const raw = this.visibleLine(text.slice(start, indices[i + 1] ?? text.length)).trim();
        const author = this.referenceFirstAuthor(raw);
        const organization = raw.match(/^([^,]{1,80}\b(?:Collaboration|Partnership)\b)/i)?.[1];
        const firstAuthorHint = /^[—–-]\./.test(raw) ? previousAuthor : surname(author || organization);
        if (firstAuthorHint) previousAuthor = firstAuthorHint;
        return { raw, fragments: [], firstAuthorHint };
      }).filter((block) => block.raw.length >= 20);
    }
    plausibleLabeledStarts(starts) {
      if (starts.length < 2) return [];
      const numeric = starts.map((match) => /^\d+$/.test(this.label(match)) ? Number(this.label(match)) : void 0);
      if (!numeric.some((value) => value != null)) return starts;
      const accepted = [];
      let expected = 1;
      for (let i = 0; i < starts.length; i++) {
        if (numeric[i] !== expected) continue;
        accepted.push(starts[i]);
        expected++;
      }
      return accepted.length >= 2 ? accepted : [];
    }
    label(match) {
      return (match[1] || match[2] || match[3] || "").trim();
    }
    referenceFirstAuthor(raw) {
      const surnameFirst = raw.match(new RegExp(`^(${SURNAME})(?:,\\s*${INITIALS}|\\s+[A-Z](?:-[A-Z])?(?=\\s*[,;]))`, "u"))?.[1];
      if (surnameFirst) return surname(surnameFirst);
      const initialsFirst = raw.match(new RegExp(`^${INITIALS_FIRST}(${SURNAME})(?=\\s*[,;])`, "u"))?.[1];
      return surname(initialsFirst);
    }
  };

  // src/reader/ReferenceOverlay.ts
  function unmatchedReferenceActions(citation) {
    const actions = [];
    if (citation.doi) actions.push({ kind: "open", label: "Open DOI", value: `https://doi.org/${citation.doi}` });
    if (citation.title) {
      actions.push({
        kind: "open",
        label: "Search",
        value: `https://scholar.google.com/scholar?q=${encodeURIComponent(citation.title)}`
      });
      actions.push({ kind: "copy", label: "Copy title", value: citation.title });
    }
    return actions;
  }
  function findIndexedReferenceMarkers(text) {
    return [...text.matchAll(/\[\s*(\d{1,4})\s*\]|(?:^|\s)(\d{1,4})[.)](?=\s+(?:[A-ZÀ-ÖØ-Þ]\.\s*|[A-ZÀ-ÖØ-Þ][\p{L}’\x27-]+\s*[,;]))/gu)].map((match) => ({
      index: Number(match[1] || match[2]),
      start: match.index + (match[2] ? match[0].search(/\d/) : 0),
      end: match.index + match[0].length
    }));
  }
  var ReferenceOverlay = class _ReferenceOverlay {
    constructor(doc, onOpen, onOpenURL = (url) => {
      doc.defaultView?.open(url, "_blank", "noopener");
    }, onCopyTitle) {
      this.doc = doc;
      this.onOpen = onOpen;
      this.onOpenURL = onOpenURL;
      this.onCopyTitle = onCopyTitle;
      this.installStyle();
      this.doc.addEventListener("click", this.clickHandler, true);
    }
    static styleID = "sansho-link-style";
    pages = [];
    hits = /* @__PURE__ */ new WeakMap();
    unmatched = /* @__PURE__ */ new WeakMap();
    claimedElements = /* @__PURE__ */ new WeakSet();
    renderedReferences = /* @__PURE__ */ new Set();
    originalTitles = new Map();
    menu;
    clickHandler = (event) => {
      const target = event.target instanceof this.doc.defaultView.Element ? event.target : null;
      if (target?.closest(".sansho-link-menu")) return;
      const hit = target?.closest(".sansho-link-hit");
      const match = hit ? this.hits.get(hit) : void 0;
      if (match) {
        event.preventDefault();
        event.stopPropagation();
        this.closeMenu();
        this.onOpen(match);
        return;
      }
      const unmatched = target?.closest(".sansho-link-unmatched");
      const citation = unmatched ? this.unmatched.get(unmatched) : void 0;
      if (!unmatched || !citation || !unmatchedReferenceActions(citation).length) {
        this.closeMenu();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.showMenu(unmatched, citation);
    };
    clear() {
      for (const [element, title] of this.originalTitles) {
        if (title == null) element.removeAttribute("title");
        else element.setAttribute("title", title);
      }
      this.originalTitles.clear();
      this.doc.querySelectorAll(".sansho-link-hit, .sansho-link-unmatched, .sansho-link-actionable").forEach((node) => {
        node.classList.remove("sansho-link-hit", "sansho-link-unmatched", "sansho-link-actionable");
      });
      this.doc.querySelectorAll(".sansho-link-badge").forEach((node) => node.remove());
      this.closeMenu();
      this.hits = /* @__PURE__ */ new WeakMap();
      this.unmatched = /* @__PURE__ */ new WeakMap();
      this.claimedElements = /* @__PURE__ */ new WeakSet();
      this.renderedReferences.clear();
    }
    linkCount() {
      return this.doc.querySelectorAll(".sansho-link-badge").length;
    }
    render(reference, match, referenceKey, citation) {
      if (this.renderedReferences.has(referenceKey) || reference.fragments.some((fragment) => this.claimedElements.has(fragment.element))) return false;
      const anchor = reference.fragments.at(-1)?.element;
      const page = anchor?.closest(".page");
      if (!anchor || !page) return false;
      for (const fragment of reference.fragments) {
        this.claimedElements.add(fragment.element);
        this.originalTitles.set(fragment.element, fragment.element.getAttribute("title"));
        fragment.element.title = match ? `登録済み：${match.record.title}（${match.method}で照合）`
          : citation?.linkReason || "ライブラリ内の文献との一致を確認できません";
        fragment.element.classList.add(match ? "sansho-link-hit" : "sansho-link-unmatched");
        if (match) this.hits.set(fragment.element, match);
        else if (citation && unmatchedReferenceActions(citation).length) {
          fragment.element.classList.add("sansho-link-actionable");
          this.unmatched.set(fragment.element, citation);
        }
      }
      this.renderedReferences.add(referenceKey);
      if (!match) return true;
      const pageRect = page.getBoundingClientRect();
      const rect = anchor.getBoundingClientRect();
      const badge = this.doc.createElement("button");
      badge.className = "sansho-link-badge";
      badge.type = "button";
      badge.textContent = match.record.pdfAttachmentID ? "\u2197 PDF" : "\u2197 Item";
      badge.title = `${match.record.title}
Matched by ${match.method}`;
      badge.style.left = `${Math.min(rect.right - pageRect.left + 6, pageRect.width - 54)}px`;
      badge.style.top = `${rect.top - pageRect.top}px`;
      badge.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onOpen(match);
      });
      page.append(badge);
      return true;
    }
    indexPages(startPage, endPage, startHeading, endHeading, references = []) {
      this.referenceIndices = new Set(references.map(ref => ref.index).filter(index => index != null));
      this.pages = [];
      const sectionText = [];
      for (const page of this.doc.querySelectorAll(".page")) {
        const pageIndex = (Number(page.dataset.pageNumber) || 1) - 1;
        if (pageIndex < startPage || pageIndex > endPage) continue;
        const spans = Array.from(page.querySelectorAll(".textLayer span"));
        if (!spans.length) continue;
        const joined = this.joinSpans(spans);
        let searchableStart = 0;
        let searchableEnd = joined.text.length;
        if (pageIndex === startPage && startHeading) {
          const headingAt = this.findHeading(joined.text, startHeading, 0);
          if (headingAt >= 0) searchableStart = headingAt + startHeading.length;
        }
        if (pageIndex === endPage && endHeading) {
          const headingAt = this.findHeading(joined.text, endHeading, searchableStart);
          if (headingAt >= 0) searchableEnd = headingAt;
        }
        if (pageIndex === startPage && references[0]) {
          // Anchor the actual bibliography, including when it has no heading.
          // Excludes body citations and figure-caption numbers on this page.
          const compact = this.compactText(joined.text);
          const prefix = this.compactText(references[0].raw).text.slice(0, 100);
          const location = prefix.length >= 24 ? this.findCompactText(compact.text, prefix, 0) : void 0;
          if (location) {
            const anchor = compact.offsets[location.start];
            // Normalization removes punctuation: a leading "[1]" anchors at
            // the digit, inside its label. Keep the whole label in the range.
            // Also handle an extractor that omits the label from raw text.
            const label = findIndexedReferenceMarkers(joined.text).find(marker =>
              marker.index === references[0].index && marker.start <= anchor &&
              (anchor < marker.end || /^\s*$/.test(joined.text.slice(marker.end, anchor))));
            searchableStart = Math.max(searchableStart, label?.start ?? anchor);
          }
        }
        const searchableText = joined.text.slice(searchableStart, searchableEnd);
        this.pages.push({
          page,
          pageIndex,
          spans,
          text: joined.text,
          offsets: joined.offsets,
          searchableStart,
          searchableEnd,
          compact: this.compactText(searchableText)
        });
        sectionText.push(searchableText);
      }
      return sectionText.join(" ");
    }
    renderIndexed(index, match, referenceKey = `index:${index}`) {
      return this.renderIndexedReference(index, match, referenceKey);
    }
    renderIndexedUnmatched(index, citation, referenceKey = `index:${index}`) {
      return this.renderIndexedReference(index, void 0, referenceKey, citation);
    }
    renderIndexedReference(index, match, referenceKey, citation) {
      for (const { text, offsets, spans, pageIndex, searchableStart, searchableEnd } of this.pages) {
        const markers = findIndexedReferenceMarkers(text).filter(marker =>
          marker.start >= searchableStart && marker.start < searchableEnd &&
          (!this.referenceIndices?.size || this.referenceIndices.has(marker.index)));
        // Prefer bracket labels when this PDF uses them. Do not interpret page
        // locators such as "p. 1109." as a new bibliography entry.
        const bracketed = markers.filter(marker => text.slice(marker.start).startsWith("["));
        const boundaries = bracketed.length ? bracketed : markers;
        const markerIndex = boundaries.findIndex((marker) => marker.index === index);
        if (markerIndex < 0) continue;
        const start = boundaries[markerIndex].start;
        if (start < searchableStart || start >= searchableEnd) continue;
        const end = Math.min(boundaries[markerIndex + 1]?.start ?? searchableEnd, searchableEnd);
        const first = offsets.findIndex((offset) => offset.end > start);
        let last = offsets.findIndex((offset) => offset.start >= end);
        if (first < 0) continue;
        if (last < 0) last = offsets.length;
        const fragments = spans.slice(first, last).map((element, order) => ({ text: element.textContent || "", element, page: pageIndex + 1, order }));
        if (!fragments.length) continue;
        return this.render({ raw: "", fragments, index }, match, referenceKey, citation);
      }
      return false;
    }
    renderTitle(title, match, referenceKey = `title:${title}`) {
      return this.renderTitleReference(title, match, referenceKey);
    }
    renderTitleUnmatched(title, citation, referenceKey = `title:${title}`) {
      return this.renderTitleReference(title, void 0, referenceKey, citation);
    }
    renderTitleReference(title, match, referenceKey, citation) {
      const target = this.compactText(title).text;
      if (target.length < 12) return false;
      for (const { compact, searchableStart, offsets, spans, pageIndex } of this.pages) {
        let from = 0;
        while (from <= compact.text.length - target.length) {
          const found = this.findCompactText(compact.text, target, from);
          if (!found) break;
          const { start: compactStart, end: compactEnd } = found;
          const start = searchableStart + compact.offsets[compactStart];
          const end = searchableStart + compact.offsets[compactEnd - 1] + 1;
          const first = offsets.findIndex((offset) => offset.end > start);
          let last = offsets.findIndex((offset) => offset.start >= end);
          if (first >= 0) {
            if (last < 0) last = spans.length;
            const fragments = spans.slice(first, last).map((element, order) => ({
              text: element.textContent || "",
              element,
              page: pageIndex + 1,
              order
            }));
            if (fragments.length && this.render({ raw: title, fragments }, match, referenceKey, citation)) return true;
          }
          from = compactStart + 1;
        }
      }
      return false;
    }
    findCompactText(source, target, from) {
      const exact = source.indexOf(target, from);
      if (exact >= 0) return { start: exact, end: exact + target.length };
      for (let start = from; start < source.length; start++) {
        let sourceIndex = start;
        let targetIndex = 0;
        while (sourceIndex < source.length && targetIndex < target.length) {
          if (source[sourceIndex] === target[targetIndex]) {
            sourceIndex++;
            targetIndex++;
            continue;
          }
          const insertedNumber = source.slice(sourceIndex).match(/^\d{1,4}/)?.[0];
          if (!insertedNumber || /\d/.test(target[targetIndex])) break;
          sourceIndex += insertedNumber.length;
        }
        if (targetIndex === target.length) return { start, end: sourceIndex };
      }
      return void 0;
    }
    destroy() {
      this.clear();
      this.doc.removeEventListener("click", this.clickHandler, true);
      this.doc.getElementById(_ReferenceOverlay.styleID)?.remove();
    }
    showMenu(anchor, citation) {
      this.closeMenu();
      const menu = this.doc.createElement("div");
      menu.className = "sansho-link-menu";
      menu.setAttribute("role", "menu");
      for (const action of unmatchedReferenceActions(citation)) {
        const button = this.doc.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        button.setAttribute("role", "menuitem");
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (action.kind === "open") {
            this.onOpenURL(action.value);
            this.closeMenu();
          } else {
            const copying = this.onCopyTitle ? this.onCopyTitle(action.value) : this.copyTitle(action.value);
            void Promise.resolve(copying).then(() => this.closeMenu(), () => this.closeMenu());
          }
        });
        menu.append(button);
      }
      (this.doc.body || this.doc.documentElement).append(menu);
      const anchorRect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const width = this.doc.documentElement.clientWidth;
      const height = this.doc.documentElement.clientHeight;
      menu.style.left = `${Math.max(8, Math.min(anchorRect.left, width - menuRect.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(anchorRect.bottom + 4, height - menuRect.height - 8))}px`;
      this.menu = menu;
    }
    closeMenu() {
      this.menu?.remove();
      this.menu = void 0;
    }
    copyTitle(title) {
      const clipboard = this.doc.defaultView?.navigator.clipboard;
      if (clipboard) return clipboard.writeText(title);
      const textarea = this.doc.createElement("textarea");
      textarea.value = title;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      (this.doc.body || this.doc.documentElement).append(textarea);
      textarea.select();
      this.doc.execCommand("copy");
      textarea.remove();
    }
    installStyle() {
      if (this.doc.getElementById(_ReferenceOverlay.styleID)) return;
      const style = this.doc.createElement("style");
      style.id = _ReferenceOverlay.styleID;
      style.textContent = `
      .sansho-link-hit { background: rgba(255, 210, 40, .34) !important; border-radius: 2px; cursor: pointer; }
      .sansho-link-unmatched { background: rgba(110, 118, 126, .45) !important; border-radius: 2px; }
      .sansho-link-actionable { cursor: pointer; }
      .sansho-link-badge { position: absolute; z-index: 50; border: 1px solid rgba(90,70,0,.35); border-radius: 4px; padding: 1px 5px; background: #fff3a6; color: #342b00; font: 600 10px/16px system-ui, sans-serif; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
      .sansho-link-badge:hover { background: #ffe35c; }
      .sansho-link-menu { position: fixed; z-index: 100; display: flex; gap: 4px; padding: 5px; border: 1px solid rgba(0,0,0,.18); border-radius: 7px; background: rgba(255,255,255,.97); box-shadow: 0 3px 12px rgba(0,0,0,.22); }
      .sansho-link-menu button { border: 0; border-radius: 4px; padding: 4px 7px; background: transparent; color: #222; font: 600 11px/16px system-ui, sans-serif; white-space: nowrap; cursor: pointer; }
      .sansho-link-menu button:hover { background: rgba(0,0,0,.08); }
    `;
      (this.doc.head || this.doc.documentElement).append(style);
    }
    joinSpans(spans) {
      let text = "";
      const offsets = [];
      for (const span of spans) {
        if (text) text += " ";
        const start = text.length;
        text += span.textContent || "";
        offsets.push({ start, end: text.length });
      }
      return { text, offsets };
    }
    findHeading(text, heading, from) {
      const words = heading.trim().split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const match = new RegExp(words.join("\\s+"), "i").exec(text.slice(from));
      return match ? from + match.index : -1;
    }
    compactText(value) {
      let text = "";
      const offsets = [];
      for (let i = 0; i < value.length; i++) {
        const normalized = value[i].normalize("NFKD").toLowerCase().replace(new RegExp("\\p{M}", "gu"), "");
        for (const character of normalized) {
          if (!/[\p{L}\p{N}]/u.test(character)) continue;
          text += character;
          offsets.push(i);
        }
      }
      return { text, offsets };
    }
  };

  // Runtime-only correction for an oversized automatically matched internal link.
  // PDF bytes, annotations, destinations and tint colors are never changed.
  var NativeLinkBounds = class {
    constructor(onError = () => {}) { this.onError = onError; }
    patches = new Map();
    originals = new WeakMap();
    validRect(rect) {
      return Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite) && rect[2] > rect[0] && rect[3] > rect[1];
    }
    area(rect) { return (rect[2] - rect[0]) * (rect[3] - rect[1]); }
    contains(rect, glyph) {
      const x = (glyph[0] + glyph[2]) / 2, y = (glyph[1] + glyph[3]) / 2;
      return x >= rect[0] - .05 && x <= rect[2] + .05 && y >= rect[1] - .05 && y <= rect[3] + .05;
    }
    sourceGlyphs(overlay, chars) {
      const sort = typeof overlay.sortIndex === "string" ? overlay.sortIndex.match(/^\d+\|(\d+)\|/) : null;
      if (!sort) return;
      const offset = Number(sort[1]);
      const start = chars.findIndex(c => c?.offset === offset);
      if (start < 0 || chars.filter(c => c?.offset === offset).length !== 1) return;
      const boundary = c => c.spaceAfter || c.lineBreakAfter || c.paragraphBreakAfter || c.c === ")" || /^\s+$/.test(c.c || "");
      const endWord = from => {
        for (let i = from; i < chars.length; i++) if (boundary(chars[i]) || i === chars.length - 1) return i;
      };
      const labelEnd = endWord(start);
      if (labelEnd == null || labelEnd === chars.length - 1) return;
      // Native matched links consist of a label word and a numeric identifier.
      // Use their stored word boundaries, not a whitelist of English labels.
      const label = chars.slice(start, labelEnd + 1).map(c => c.c || "").join("").replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (!/^[\p{L}\p{M}.-]+$/u.test(label) || [...label.matchAll(/\p{L}/gu)].length < 3) return;
      let numberStart = labelEnd + 1;
      while (numberStart < chars.length && /^\s+$/.test(chars[numberStart].c || "")) numberStart++;
      if (!/^\(?\d/.test(chars.slice(numberStart, numberStart + 2).map(c => c.c || "").join(""))) return;
      const numberEnd = endWord(numberStart);
      if (numberEnd == null) return;
      const full = chars.slice(start, numberEnd + 1);
      if (full.some((c, i) => !this.validRect(c.rect) || c.offset !== offset + i || c.diagonal || (c.rotation || 0) % 90 !== 0)) return;
      // Reject a guessed token boundary unless it reproduces the native box.
      const bounds = [Math.min(...full.map(c => c.rect[0])), Math.min(...full.map(c => c.rect[1])), Math.max(...full.map(c => c.rect[2])), Math.max(...full.map(c => c.rect[3]))];
      if (bounds.some((v, i) => Math.abs(v - overlay.position.rects[0][i]) > .5)) return;
      if (!full.slice(0, -1).some(c => c.lineBreakAfter)) return;
      const glyphs = full.filter(c => !/^\s+$/.test(c.c || ""));
      // A closing parenthesis belonging to surrounding prose isn't a label.
      const pairs = { ")": "(", "]": "[", "}": "{" };
      while (glyphs.length) {
        const last = glyphs.at(-1).c;
        if (/^[,.;:!?]$/.test(last)) { glyphs.pop(); continue; }
        if (pairs[last]) {
          const value = glyphs.map(c => c.c).join("");
          if ([...value].filter(c => c === last).length > [...value].filter(c => c === pairs[last]).length) { glyphs.pop(); continue; }
        }
        break;
      }
      return glyphs;
    }
    narrow(overlay, chars) {
      if (overlay?.type !== "internal-link" || overlay.source !== "matched" ||
          overlay.position?.rects?.length !== 1 || overlay.position.nextPageRects ||
          !Array.isArray(chars)) return overlay;
      const box = overlay.position.rects[0];
      if (!this.validRect(box)) return overlay;
      const glyphs = this.sourceGlyphs(overlay, chars);
      if (!glyphs?.length) return overlay;
      const rotations = new Set(glyphs.map(c => ((c.rotation || 0) % 360 + 360) % 360));
      if (rotations.size !== 1) return overlay;
      const vertical = [...rotations][0] % 180 === 90;
      const lines = [];
      for (const glyph of glyphs) {
        const rect = glyph.rect, center = vertical ? (rect[0] + rect[2]) / 2 : (rect[1] + rect[3]) / 2;
        const height = vertical ? rect[2] - rect[0] : rect[3] - rect[1];
        let line = lines.find(l => Math.abs(l.center - center) <= Math.min(l.height, height) * .4);
        if (!line) { line = { center, height, rect: [...rect] }; lines.push(line); }
        else line.rect = [Math.min(line.rect[0], rect[0]), Math.min(line.rect[1], rect[1]), Math.max(line.rect[2], rect[2]), Math.max(line.rect[3], rect[3])];
      }
      const rects = lines.map(l => l.rect);
      const area = rects.reduce((sum, rect) => sum + this.area(rect), 0);
      // Already-tight boxes and unsupported layouts stay untouched.
      if (rects.length < 2 || !area || area >= this.area(box) * .98 || rects.some(r =>
        r[0] < box[0] - .5 || r[1] < box[1] - .5 || r[2] > box[2] + .5 || r[3] > box[3] + .5)) return overlay;
      const corrected = { ...overlay, position: { ...overlay.position, rects } };
      this.originals.set(corrected, overlay);
      return corrected;
    }
    correctPageData(data) {
      if (!Array.isArray(data?.overlays) || !Array.isArray(data.chars)) return data;
      const overlays = data.overlays.map(o => this.narrow(o, data.chars));
      return overlays.some((o, i) => o !== data.overlays[i]) ? { ...data, overlays } : data;
    }
    restorePageData(data) {
      if (!Array.isArray(data?.overlays)) return data;
      const overlays = data.overlays.map(o => this.originals.get(o) || o);
      return overlays.some((o, i) => o !== data.overlays[i]) ? { ...data, overlays } : data;
    }
    replacePage(view, key, corrected) {
      const previous = view._pdfPages[key];
      if (previous === corrected) return;
      // A live hover/preview can still point at the old overlay object.
      for (let i = 0; i < previous.overlays.length; i++) {
        if (view._hover === previous.overlays[i].position) view._hover = corrected.overlays[i].position;
        if (view._selectedOverlay === previous.overlays[i]) view._selectedOverlay = corrected.overlays[i];
      }
      view._pdfPages[key] = corrected;
    }
    attachReader(reader) {
      for (const view of [reader._internalReader?._primaryView, reader._internalReader?._secondaryView]) {
        if (!view || this.patches.has(view) || typeof view._mergeProcessedPageData !== "function" || !view._pdfPages) continue;
        const own = Object.getOwnPropertyDescriptor(view, "_mergeProcessedPageData");
        const original = view._mergeProcessedPageData;
        const corrector = this;
        const lease = { active: true };
        const wrapper = function(...args) {
          const data = original.apply(this, args);
          if (!lease.active) return data;
          try { return corrector.correctPageData(data); }
          catch (error) { corrector.onError(error); return data; }
        };
        try {
          view._mergeProcessedPageData = wrapper;
          this.patches.set(view, { reader, own, original, wrapper, lease });
          for (const key of Object.keys(view._pdfPages)) this.replacePage(view, key, this.correctPageData(view._pdfPages[key]));
          view._render?.();
        } catch (error) { this.onError(error); }
      }
    }
    detachReader(reader) {
      for (const [view, patch] of this.patches) {
        if (reader && patch.reader !== reader) continue;
        patch.lease.active = false;
        if (view._mergeProcessedPageData === patch.wrapper) {
          if (patch.own) Object.defineProperty(view, "_mergeProcessedPageData", patch.own);
          else delete view._mergeProcessedPageData;
        }
        for (const key of Object.keys(view._pdfPages || {})) this.replacePage(view, key, this.restorePageData(view._pdfPages[key]));
        try { view._render?.(); } catch (error) { this.onError(error); }
        this.patches.delete(view);
      }
    }
  };

  // src/reader/ReaderIntegration.ts
  var ReaderIntegration = class {
    constructor(zotero, pluginID) {
      this.zotero = zotero;
      this.pluginID = pluginID;
      this.nativeLinkBounds = new NativeLinkBounds(error => this.zotero.logError(error));
    }
    states = /* @__PURE__ */ new WeakMap();
    readers = /* @__PURE__ */ new Set();
    parser = new CitationParser();
    sectionExtractor = new PdfSectionExtractor();
    matcherCache = /* @__PURE__ */ new Map();
    notifierID;
    toolbarHandler = (event) => this.onToolbar(event);
    stopped = false;
    start() {
      this.stopped = false;
      this.zotero.Reader.registerEventListener("renderToolbar", this.toolbarHandler, this.pluginID);
      this.notifierID = this.zotero.Notifier?.registerObserver({ notify: () => {
        this.matcherCache.clear();
        for (const reader of this.readers) {
          const state = this.states.get(reader);
          if (state) state.fingerprint = void 0;
          this.scheduleScan(reader);
        }
      } }, ["item"], this.pluginID);
      // renderToolbar is emitted when a toolbar mounts. Updating/enabling a
      // plugin does not replay it for PDFs which are already open.
      for (const reader of this.zotero.Reader._readers || []) {
        Promise.resolve(reader._initPromise).then(() => {
          if (!this.stopped) this.restoreOpenReader(reader);
        }).catch(error => this.zotero.logError(error));
      }
    }
    restoreOpenReader(reader) {
      const doc = reader._iframeWindow?.document;
      const host = doc?.querySelector(".toolbar .end .custom-sections");
      if (!host) return;
      this.onToolbar({ reader, doc, append: button => {
        const section = doc.createElement("div");
        section.className = "section";
        section.setAttribute("data-sansho-link-section", "true");
        section.append(button);
        host.append(section);
      } });
    }
    stop() {
      this.stopped = true;
      this.zotero.Reader.unregisterEventListener("renderToolbar", this.toolbarHandler);
      if (this.notifierID != null) this.zotero.Notifier?.unregisterObserver(this.notifierID);
      this.matcherCache.clear();
      for (const reader of this.readers) this.destroyReader(reader);
      this.readers.clear();
    }
    onToolbar({ reader, doc, append }) {
      if (!doc || !append || this.stopped) return;
      // Remove only our own control, including one left by an older version.
      doc.querySelectorAll('button[aria-label="参照リンク：参考文献を再スキャン"]').forEach(node => {
        const section = node.closest('[data-sansho-link-section="true"]');
        node.remove();
        section?.remove();
      });
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "toolbar-button";
      button.title = "参考文献を再スキャンして保存済みの論文にリンク";
      button.setAttribute("aria-label", "参照リンク：参考文献を再スキャン");
      button.textContent = "参照 ↗";
      button.style.minWidth = "64px";
      button.style.whiteSpace = "nowrap";
      this.installToolbarStyle(doc);
      button.addEventListener("click", async () => {
        const original = button.textContent;
        button.textContent = "Scanning\u2026";
        button.disabled = true;
        try {
          await this.scan(reader, true, true);
        } catch (error) {
          this.zotero.logError(error);
          button.title = error instanceof Error ? error.message : String(error);
        } finally {
          button.textContent = original;
          button.disabled = false;
        }
      });
      append(button);
      const summary = this.createSummary(doc, button);
      (doc.body || doc.documentElement).append(summary);
      const state = this.states.get(reader) || { scanning: false };
      if (state.summaryTimer) state.summary?.ownerDocument.defaultView?.clearTimeout(state.summaryTimer);
      state.summary?.remove();
      state.summary = summary;
      state.toolbarButton = button;
      state.fingerprint = void 0;
      state.summaryTimer = void 0;
      this.states.set(reader, state);
      this.attach(reader);
      this.scheduleScan(reader, 1200);
    }
    attach(reader) {
      this.readers.add(reader);
      const state = this.states.get(reader) || { scanning: false };
      this.states.set(reader, state);
      this.nativeLinkBounds.attachReader(reader);
      const win = reader._iframeWindow;
      if (!win?.document?.documentElement || state.outerObserver) return;
      const Observer = win.MutationObserver;
      const observer = new Observer(() => {
        const viewer = this.getViewerDocument(reader);
        if (viewer && viewer !== state.viewerDocument) {
          this.observeViewer(reader, viewer);
          this.scheduleScan(reader);
        }
      });
      observer.observe(win.document.documentElement, { childList: true, subtree: true });
      state.outerObserver = observer;
      if (!state.unloadHandler) {
        state.unloadHandler = () => {
          this.destroyReader(reader);
          this.readers.delete(reader);
        };
        win.addEventListener("unload", state.unloadHandler, { once: true });
      }
      this.scheduleScan(reader, 1200);
    }
    scheduleScan(reader, delay = 500) {
      const state = this.states.get(reader);
      const win = reader._iframeWindow;
      if (!state || !win || this.stopped) return;
      if (state.timer) win.clearTimeout(state.timer);
      state.timer = win.setTimeout(() => {
        void this.scan(reader, false).catch(() => {}); // scan already logs errors
      }, delay);
    }
    async scan(reader, reportEmpty, force = false) {
      if (!this.stopped) this.nativeLinkBounds.attachReader(reader);
      const state = this.states.get(reader);
      const doc = this.getViewerDocument(reader);
      if (!state || !doc || state.scanning || this.stopped) return void 0;
      this.observeViewer(reader, doc);
      const fingerprint = this.pageFingerprint(doc);
      if (!force && state.fingerprint === fingerprint) return state.lastMatched;
      state.fingerprint = fingerprint;
      state.scanning = true;
      try {
        if (force) state.sectionPromise = void 0;
        const section = await this.getReferenceSection(reader, state);
        if (this.stopped) return void 0;
        if (!section) {
          if (reportEmpty && state.summary) {
            state.summary.textContent = "参考文献一覧を検出できませんでした";
            state.summary.style.display = "block";
          }
          if (reportEmpty) this.zotero.debug("参照リンク: no rendered References section found. Scroll to the references pages and retry.");
          return void 0;
        }
        const attachment = this.getAttachment(reader);
        if (!attachment) return void 0;
        const currentItemID = typeof attachment.parentID === "number" ? attachment.parentID : void 0;
        if (force) this.matcherCache.delete(attachment.libraryID);
        const matcher = await this.getMatcher(attachment.libraryID);
        if (this.stopped) return void 0;
        if (!state.overlay || state.overlayDocument !== doc) {
          state.overlay?.destroy();
          state.overlay = new ReferenceOverlay(
            doc,
            (match) => void this.open(match.record.item.id, match.record.pdfAttachmentID),
            (url) => this.zotero.launchURL(url)
          );
          state.overlayDocument = doc;
        }
        state.overlay.clear();
        state.overlay.indexPages(section.startPage, section.endPage, section.startHeading, section.endHeading, section.references);
        let matchedItems = 0;
        let ambiguousItems = 0;
        let unmatchedItems = 0;
        let unplacedItems = 0;
        let selfItems = 0;
        for (const [position, reference] of section.references.entries()) {
          const citation = this.parser.parse(reference);
          const outcome = matcher.matchWithOutcome(citation);
          const match = outcome.match;
          citation.linkReason = outcome.ambiguous ? "候補が複数あり、特定できません"
            : !citation.title && !citation.doi && !citation.arxiv ? "識別子やタイトルを十分に読み取れません"
            : "ライブラリ内の文献との一致を確認できません（未登録とは限りません）";
          const referenceKey = reference.index == null ? `reference:${position}` : `index:${reference.index}`;
          if (!match) {
            if (outcome.ambiguous) ambiguousItems++;
            else unmatchedItems++;
            if (reference.index != null) {
              state.overlay.renderIndexedUnmatched(reference.index, citation, referenceKey);
            } else {
              state.overlay.renderTitleUnmatched(citation.title || reference.raw, citation, referenceKey);
            }
            continue;
          }
          matchedItems++;
          if (match.record.item.id === currentItemID) { selfItems++; continue; }
          const placed = reference.index != null ? state.overlay.renderIndexed(reference.index, match, referenceKey) : state.overlay.renderTitle(citation.title || reference.raw, match, referenceKey);
          if (!placed) unplacedItems++;
        }
        const linked = state.overlay.linkCount();
        this.updateSummary(state, {
          scanned: section.references.length,
          matched: matchedItems,
          ambiguous: ambiguousItems,
          unmatched: unmatchedItems, linked, unplaced: unplacedItems, self: selfItems
        });
        this.zotero.debug(`参照リンク: ${linked} links rendered; ${matchedItems} library items matched; source=${section.source}`);
        state.lastMatched = linked;
        return linked;
      } catch (error) {
        state.fingerprint = void 0; // A transient load error must be retryable.
        this.zotero.logError(error);
        if (reportEmpty && state.summary) {
          state.summary.textContent = "参照リンクの読み込みに失敗しました。再スキャンしてください";
          state.summary.style.display = "block";
        }
        throw error;
      } finally {
        state.scanning = false;
      }
    }
    getReferenceSection(reader, state) {
      if (!state.sectionPromise) {
        const pdf = this.getPdfDocument(reader);
        if (!pdf) return Promise.resolve(void 0);
        const pending = this.sectionExtractor.extract(pdf);
        state.sectionPromise = pending;
        pending.then(section => {
          if ((!section || !section.references.length) && state.sectionPromise === pending) state.sectionPromise = void 0;
        }, () => {
          if (state.sectionPromise === pending) state.sectionPromise = void 0;
        });
      }
      return state.sectionPromise;
    }
    installToolbarStyle(doc) {
      if (doc.getElementById("sansho-link-toolbar-style")) return;
      const style = doc.createElement("style");
      style.id = "sansho-link-toolbar-style";
      style.textContent = `
      .sansho-link-summary {
        position: fixed; right: 0; z-index: 1000; display: none; min-width: 128px;
        box-sizing: border-box; padding: 8px 10px; border-radius: 6px;
        background: rgba(24, 119, 242, .5); color: white;
        font: 600 12px/1.55 system-ui, sans-serif; white-space: pre;
        pointer-events: none; box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
      }
    `;
      (doc.head || doc.documentElement).append(style);
    }
    createSummary(doc, button) {
      const summary = doc.createElement("div");
      summary.className = "sansho-link-summary";
      summary.setAttribute("role", "status");
      summary.setAttribute("aria-live", "polite");
      const position = () => {
        const rect = button.getBoundingClientRect();
        summary.style.top = `${rect.bottom + 6}px`;
        summary.style.right = "0";
      };
      position();
      return summary;
    }
    updateSummary(state, counts) {
      if (!state.summary) return;
      state.summary.textContent = `検出 : ${counts.scanned}
一致 : ${counts.matched}
候補複数 : ${counts.ambiguous}
未一致 : ${counts.unmatched}
画面内のリンク : ${counts.linked}
未表示（ページ未表示を含む） : ${counts.unplaced}`;
      state.summary.style.display = "block";
      const summary = state.summary;
      const win = summary.ownerDocument.defaultView;
      if (!win) return;
      if (state.summaryTimer) win.clearTimeout(state.summaryTimer);
      state.summaryTimer = win.setTimeout(() => {
        if (state.summary === summary) summary.style.display = "none";
        state.summaryTimer = void 0;
      }, 3e4);
    }
    pageFingerprint(doc) {
      return Array.from(doc.querySelectorAll(".page")).map((page) => {
        const spans = page.querySelectorAll(".textLayer span");
        const first = spans.item(0)?.textContent || "";
        const last = spans.item(spans.length - 1)?.textContent || "";
        return `${page.dataset.pageNumber || "?"}:${spans.length}:${first}:${last}`;
      }).join("|");
    }
    getPdfDocument(reader) {
      const internal = reader._internalReader;
      return internal?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
    }
    getMatcher(libraryID) {
      let pending = this.matcherCache.get(libraryID);
      if (!pending) {
        pending = (async () => {
          const matcher = new LibraryMatcher(this.zotero);
          await matcher.index(libraryID);
          return matcher;
        })();
        this.matcherCache.set(libraryID, pending);
        pending.catch(() => this.matcherCache.delete(libraryID));
      }
      return pending;
    }
    getViewerDocument(reader) {
      const outer = reader._iframeWindow?.document;
      if (!outer) return void 0;
      const iframe = outer.querySelector("#primary-view > iframe, .primary-view > iframe");
      return iframe?.contentDocument || void 0;
    }
    observeViewer(reader, doc) {
      const state = this.states.get(reader);
      const win = doc.defaultView;
      if (!state || !win || state.viewerDocument === doc) return;
      state.viewerObserver?.disconnect();
      const Observer = win.MutationObserver;
      state.viewerObserver = new Observer((mutations) => {
        const changedReaderContent = mutations.some(
          (mutation) => Array.from(mutation.addedNodes).some((node) => !this.isOwnNode(node)) || Array.from(mutation.removedNodes).some((node) => !this.isOwnNode(node))
        );
        if (changedReaderContent) this.scheduleScan(reader);
      });
      state.viewerObserver.observe(doc.documentElement, { childList: true, subtree: true });
      state.viewerDocument = doc;
    }
    isOwnNode(node) {
      if (node.nodeType !== 1) return false;
      const element = node;
      return element.matches(".sansho-link-badge, .sansho-link-menu, #sansho-link-style") || Boolean(element.closest(".sansho-link-badge, .sansho-link-menu"));
    }
    getAttachment(reader) {
      const item = reader._item || (reader.itemID ? this.zotero.Items.get(reader.itemID) : false);
      return item && item.isAttachment() ? item : void 0;
    }
    async open(itemID, pdfAttachmentID) {
      if (pdfAttachmentID) {
        await this.zotero.Reader.open(pdfAttachmentID);
        return;
      }
      const pane = this.zotero.getMainWindow().ZoteroPane;
      await pane?.selectItem(itemID);
    }
    destroyReader(reader) {
      this.nativeLinkBounds.detachReader(reader);
      const state = this.states.get(reader);
      state?.outerObserver?.disconnect();
      state?.viewerObserver?.disconnect();
      state?.overlay?.destroy();
      state?.summary?.remove();
      const button = state?.toolbarButton;
      const section = button?.closest('[data-sansho-link-section="true"]');
      button?.remove();
      section?.remove();
      const win = reader._iframeWindow;
      if (state?.timer && win) win.clearTimeout(state.timer);
      if (state?.summaryTimer) state.summary?.ownerDocument.defaultView?.clearTimeout(state.summaryTimer);
      if (state?.unloadHandler && win) win.removeEventListener("unload", state.unloadHandler);
    }
  };

  // src/index.ts
  var integration;
  async function startup({ pluginID, Zotero }) {
    integration = new ReaderIntegration(Zotero, pluginID);
    integration.start();
    Zotero.debug("参照リンク started");
  }
  async function shutdown() {
    integration?.stop();
    integration = void 0;
  }
  return __toCommonJS(index_exports);
})();

