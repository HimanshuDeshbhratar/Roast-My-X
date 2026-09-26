const GITHUB_API = "https://api.github.com";

export type GithubExtract = {
  owner: string;
  repo: string;
  url: string;
  summary: string;
  stars: number;
  forks: number;
  description: string;
};

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RoastMyX/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Accepts https://github.com/owner/repo, owner/repo, or git URLs.
 */
export function parseGithubRepo(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/i, "");
  if (!trimmed) throw new Error("GitHub repo is required");

  let owner = "";
  let repo = "";

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      if (!u.hostname.includes("github.com")) {
        throw new Error("Only GitHub repos are supported");
      }
      const parts = u.pathname.split("/").filter(Boolean);
      owner = parts[0] || "";
      repo = (parts[1] || "").replace(/\.git$/i, "");
    } else {
      const parts = trimmed.split("/").filter(Boolean);
      if (parts.length === 2) {
        owner = parts[0];
        repo = parts[1];
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("GitHub")) throw err;
    throw new Error("Invalid GitHub repo URL");
  }

  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    throw new Error("Use owner/repo or a github.com URL");
  }

  return { owner, repo };
}

async function ghJson<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) {
    // Private repos often look like 404 without auth
    throw new Error("Repo not found (is it public?)");
  }
  if (res.status === 401) {
    throw new Error("That repo's more private than your browser history.");
  }
  if (res.status === 403) {
    const body = await res.text().catch(() => "");
    if (/rate limit|secondary rate|abuse detection/i.test(body)) {
      throw new Error(
        "GitHub rate limit hit. Add a free GITHUB_TOKEN in .env for higher limits."
      );
    }
    throw new Error("That repo's more private than your browser history.");
  }
  if (!res.ok) throw new Error(`GitHub API error (${res.status})`);
  return res.json() as Promise<T>;
}

export async function extractGithubRepo(input: string): Promise<GithubExtract> {
  const { owner, repo } = parseGithubRepo(input);

  const [meta, languages, commits] = await Promise.all([
    ghJson<{
      description: string | null;
      stargazers_count: number;
      forks_count: number;
      html_url: string;
      language: string | null;
      topics?: string[];
    }>(`/repos/${owner}/${repo}`),
    ghJson<Record<string, number>>(`/repos/${owner}/${repo}/languages`).catch(
      () => ({}) as Record<string, number>
    ),
    ghJson<Array<{ commit: { message: string } }>>(
      `/repos/${owner}/${repo}/commits?per_page=30`
    ).catch(() => [] as Array<{ commit: { message: string } }>),
  ]);

  let readme = "";
  try {
    const readmeRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/readme`,
      {
        headers: {
          ...githubHeaders(),
          Accept: "application/vnd.github.raw",
        },
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (readmeRes.ok) {
      readme = (await readmeRes.text()).slice(0, 10_000);
    }
  } catch {
    // optional
  }

  const langLines = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, bytes]) => `- ${name}: ${bytes} bytes`);

  const commitLines = commits
    .slice(0, 30)
    .map((c) => `- ${c.commit.message.split("\n")[0].slice(0, 120)}`);

  const summary = [
    `Repo: ${owner}/${repo}`,
    `URL: ${meta.html_url}`,
    meta.description ? `Description: ${meta.description}` : null,
    `Stars: ${meta.stargazers_count} | Forks: ${meta.forks_count}`,
    meta.language ? `Primary language: ${meta.language}` : null,
    meta.topics?.length ? `Topics: ${meta.topics.join(", ")}` : null,
    langLines.length ? `Language breakdown:\n${langLines.join("\n")}` : null,
    commitLines.length
      ? `Recent commit messages:\n${commitLines.join("\n")}`
      : null,
    readme ? `README:\n${readme}` : "README: (none or empty)",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 14_000);

  if (summary.length < 60) {
    throw new Error("Could not extract enough repo content to roast");
  }

  return {
    owner,
    repo,
    url: meta.html_url,
    summary,
    stars: meta.stargazers_count,
    forks: meta.forks_count,
    description: meta.description || "",
  };
}
