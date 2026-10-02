import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export async function mergedPhase(repository, branch, base, commit, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid repository or commit');
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'phase-release-script' };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async url => {
    const response = await request(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`GitHub merge check returned HTTP ${response.status}`);
    return response.json();
  };
  const owner = repository.split('/')[0];
  const query = new URLSearchParams({ state: 'closed', head: `${owner}:${branch}`, base, per_page: '100' });
  const pulls = await get(`https://api.github.com/repos/${repository}/pulls?${query}`);
  const candidate = pulls.find(p => p.head.sha === commit && p.head.ref === branch && p.base.ref === base && p.merged_at);
  if (!candidate) return { state: 'WAITING' };
  const pr = await get(`https://api.github.com/repos/${repository}/pulls/${candidate.number}`);
  if (!pr.merged || pr.head.sha !== commit || pr.base.ref !== base || !pr.merge_commit_sha) return { state: 'WAITING' };
  return { state: 'MERGED', headRefOid: commit, mergeCommit: { oid: pr.merge_commit_sha }, url: pr.html_url };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await mergedPhase(...process.argv.slice(2)))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
