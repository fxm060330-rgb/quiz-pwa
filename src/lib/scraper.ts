import * as cheerio from "cheerio";

const BASE_URL = "https://www.shititong.cn/cha-kan/tikuheji/CB25E23F809000017C114C501C5015E6.html";

export async function scrapeQuestions(): Promise<{ questions: import("@/types").Question[]; error?: string }> {
  try {
    // Fetch the main page to get sub-page links
    const mainResp = await fetch(BASE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!mainResp.ok) {
      return { questions: [], error: `HTTP ${mainResp.status}: 无法访问题库页面` };
    }
    const mainHtml = await mainResp.text();
    const $ = cheerio.load(mainHtml);

    // Try to find question list links - the page may have sub-pages
    const pageLinks: string[] = [BASE_URL];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("CB25E23F809000017C114C501C5015E6") && href !== BASE_URL) {
        const url = href.startsWith("http") ? href : `https://www.shititong.cn${href}`;
        if (!pageLinks.includes(url)) pageLinks.push(url);
      }
    });

    // Also try finding pagination links
    $(".pagination a, .page-link, a.page").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !pageLinks.includes(href)) {
        const url = href.startsWith("http") ? href : `https://www.shititong.cn${href}`;
        pageLinks.push(url);
      }
    });

    const questions: import("@/types").Question[] = [];

    // Try to parse questions directly from the main page first
    const directQuestions = parseQuestionPage($);
    questions.push(...directQuestions);

    // If we found sub-pages, fetch them too (limit to 20 pages to avoid overload)
    const subPages = pageLinks.slice(1, 21);
    for (const link of subPages) {
      try {
        const resp = await fetch(link, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (resp.ok) {
          const html = await resp.text();
          const $$ = cheerio.load(html);
          const pageQuestions = parseQuestionPage($$);
          questions.push(...pageQuestions);
        }
      } catch {
        // Skip failed sub-pages
      }
    }

    if (questions.length === 0) {
      return { questions: [], error: "未能解析到题目，请检查题库页面结构是否有变化" };
    }

    // Deduplicate by question text
    const seen = new Set<string>();
    const unique = questions.filter((q) => {
      const key = q.question.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Assign IDs if missing
    unique.forEach((q, i) => {
      if (!q.id) q.id = `q-${i + 1}`;
    });

    return { questions: unique };
  } catch (e: unknown) {
    return { questions: [], error: `抓取失败: ${(e as Error).message}` };
  }
}

function parseQuestionPage($: cheerio.CheerioAPI): import("@/types").Question[] {
  const questions: import("@/types").Question[] = [];

  // Common patterns for Chinese exam question sites
  // Try multiple selectors
  const selectors = [
    ".question-item",
    ".question",
    ".exam-item",
    ".ti-item",
    ".test-item",
    "[class*='question']",
    "[class*='exam']",
    ".content .item",
    "li",
  ];

  for (const selector of selectors) {
    const items = $(selector);
    if (items.length > 0 && items.length < 2000) {
      items.each((i, el) => {
        const q = parseSingleQuestion($, el, i);
        if (q && q.question.length > 5) {
          questions.push(q);
        }
      });
      if (questions.length > 10) break;
    }
  }

  // Fallback: try parsing raw text for question patterns
  if (questions.length === 0) {
    // Fallback: parse raw text for question patterns
    const bodyText = $("body").text();
    const lines = bodyText.split("\n").filter((l) => l.trim().length > 0);

    // Try to find question blocks: numbered items followed by A/B/C/D options
    let currentQ: Partial<import("@/types").Question> | null = null;
    const rawQuestions: import("@/types").Question[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const qMatch = trimmed.match(/^(\d+)[\.、\)]\s*(.+)/);
      const optMatch = trimmed.match(/^([A-F])[\.、\)]\s*(.+)/);

      if (qMatch) {
        if (currentQ && currentQ.options && currentQ.options.length >= 2) {
          rawQuestions.push(currentQ as import("@/types").Question);
        }
        currentQ = {
          id: `q-${qMatch[1]}`,
          type: "single",
          question: qMatch[2],
          options: [],
          answer: "",
          analysis: "",
          chapter: "默认章节",
          difficulty: 1,
        };
      } else if (optMatch && currentQ) {
        currentQ.options = currentQ.options || [];
        currentQ.options.push(optMatch[2]);
      }
    }
    if (currentQ && currentQ.options && currentQ.options.length >= 2) {
      rawQuestions.push(currentQ as import("@/types").Question);
    }

    return rawQuestions;
  }

  return questions;
}

function parseSingleQuestion(
  $: cheerio.CheerioAPI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  index: number
): import("@/types").Question | null {
  const $el = $(el);
  const fullText = $el.text().trim();

  // Skip if too short or clearly not a question
  if (fullText.length < 10) return null;

  // Try to extract question text
  const questionText =
    $el.find(".question-text, .title, .stem, [class*='title'], [class*='stem']").first().text().trim() ||
    $el.contents().first().text().trim();

  // Extract options
  const options: string[] = [];
  $el.find(".option, .options li, [class*='option']").each((_, opt) => {
    const text = $(opt).text().trim();
    if (text) options.push(text);
  });

  // If no structured options, try regex from text
  if (options.length === 0) {
    const optMatches = fullText.match(/[A-F][\.、\)]\s*(.+?)(?=[A-F][\.、\)]|正确答案|$)/g);
    if (optMatches) {
      optMatches.forEach((o) => {
        const cleaned = o.replace(/^[A-F][\.、\)]\s*/, "").trim();
        if (cleaned) options.push(cleaned);
      });
    }
  }

  // Extract answer
  const answerText =
    $el.find(".answer, .correct, [class*='answer'], [class*='correct']").first().text().trim() ||
    (fullText.match(/正确答案[：:]\s*([A-F]+)/) || [])[1] ||
    "";

  // Extract analysis
  const analysis =
    $el.find(".analysis, .explanation, .parse, [class*='analysis'], [class*='explain']").first().text().trim() || "";

  // Extract chapter
  const chapter =
    $el.find(".chapter, .category, [class*='chapter'], [class*='category']").first().text().trim() ||
    $el.closest("[data-chapter]").attr("data-chapter") ||
    "默认章节";

  return {
    id: `q-${index + 1}`,
    type: "single",
    question: questionText || fullText.slice(0, 200),
    options: options.length >= 2 ? options : ["正确", "错误"],
    answer: answerText,
    analysis,
    chapter,
    difficulty: 1,
  };
}
