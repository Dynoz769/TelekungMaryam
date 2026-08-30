// Minimal helper for reading/writing files in this repo via the GitHub
// Contents API. Used by the admin endpoints (to commit product/price/image
// changes) and by _catalog.js (to read the live price list at checkout) --
// this keeps one source of truth (products.json + images/) that lives in
// git, versioned and reversible, without needing a separate database.
//
// Requires these environment variables in Vercel:
//   GITHUB_TOKEN   Fine-grained PAT with "Contents: Read and write" on
//                  this one repo
//   GITHUB_REPO    "owner/repo", e.g. "Dynoz769/TelekungMaryam"
//   GITHUB_BRANCH  Branch to commit to (defaults to "main")

const API = 'https://api.github.com';

function repoInfo() {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!repo || !token) {
    throw new Error('GITHUB_REPO / GITHUB_TOKEN not configured');
  }
  return { repo, token, branch };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'telekung-maryam-admin',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// GitHub's Contents API path segment must NOT have its slashes encoded --
// only encode within each segment.
function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

// Returns { content, sha } where content is the decoded UTF-8 string, or
// { content: null, sha: null } if the file doesn't exist yet.
async function getFile(path) {
  const { repo, token, branch } = repoInfo();
  const res = await fetch(`${API}/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return { content: null, sha: null };
  if (!res.ok) throw new Error(`GitHub getFile ${path} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

// Creates or updates a file. `content` may be a string (text) or a Buffer
// (binary, e.g. an image). Pass the current `sha` when updating an existing
// file (omit/undefined when creating a new one).
async function putFile(path, content, message, sha) {
  const { repo, token, branch } = repoInfo();
  const body = {
    message,
    content: Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(String(content), 'utf-8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API}/repos/${repo}/contents/${encodePath(path)}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub putFile ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

module.exports = { getFile, putFile };
