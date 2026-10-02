import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ReleaseRunner, validateFile } from '../finish-phase.mjs';
import { mergedPhase } from '../github-state.mjs';

function fixture(t, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'phase-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Release Test');
  mkdirSync(join(root, 'docs')); mkdirSync(join(root, 'src'));
  writeFileSync(join(root, '.gitignore'), '.agents/\n');
  writeFileSync(join(root, 'src/phase.ts'), 'export const value = 1;\n');
  writeFileSync(join(root, 'src/previous.ts'), '// previous phase\n');
  writeFileSync(join(root, 'docs/status.md'), 'old docs\n');
  git('add', '--', '.gitignore', 'src/phase.ts', 'src/previous.ts', 'docs/status.md'); git('commit', '-m', 'base');
  const base = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/main', base);
  writeFileSync(join(root, 'src/phase.ts'), 'export const value = 2;\n');
  writeFileSync(join(root, 'unrelated.txt'), 'must remain local\n');
  const manifest = { phase: '10C', baseBranch: 'main', branch: 'codex/phase-10c', nextBranch: 'codex/phase-11',
    repository: 'owner/repo', title: 'Phase 10C', implementation: ['src/phase.ts'], documentation: ['docs/status.md'],
    handoff: 'handoff.md', graphifyRequired: false, verification: [{ command: 'check', args: [], name: 'check' }] };
  writeFileSync(join(root, 'handoff.md'), 'Verified implementation; do not claim live replay enabled.');
  const calls = [];
  let pr = null;
  const prs = [];
  const execute = (command, args, settings = {}) => {
    calls.push({ command, args, cwd: settings.cwd });
    if (command === 'git') {
      const operation = args[0] === '-c' ? args[2] : args[0];
      if (operation === 'push' && args.some(p => p === 'HEAD:refs/heads/main')) {
        const head = spawnSync('git', ['-c', `safe.directory=${root}`, '-C', settings.cwd, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
        git('update-ref', 'refs/remotes/origin/main', head);
      }
      if (operation === 'push' || operation === 'fetch') return { status: 0, stdout: '', stderr: '' };
      if (operation === 'pull') return spawnSync('git', ['-c', `safe.directory=${root}`, '-C', settings.cwd ?? root, 'merge', '--ff-only', 'origin/main'], { encoding: 'utf8' });
      const result = spawnSync('git', ['-c', `safe.directory=${root}`, '-C', settings.cwd ?? root, ...args], { encoding: 'utf8' });
      return result;
    }
    if (command === 'codex') {
      writeFileSync(join(settings.cwd, 'docs/status.md'), 'Phase 10C documented; limitations retained.\n');
      if (options.badDocs) writeFileSync(join(settings.cwd, 'src/phase.ts'), 'overwritten by docs agent');
      if (options.concurrentDocs) writeFileSync(join(root, 'docs/status.md'), 'manual concurrent edit');
    }
    if (command === 'graphify') {
      mkdirSync(join(settings.cwd, 'graphify-out'), { recursive: true });
      writeFileSync(join(settings.cwd, 'graphify-out/graph.json'), '{"refreshed":true}');
      if (options.unexpectedGraph) writeFileSync(join(settings.cwd, 'src/phase.ts'), 'unexpected graph edit');
    }
    if (command === 'check' && options.failCheck) return { status: 1, stdout: '', stderr: 'test failure' };
    if (command === 'lint-check') return { status: 1, stdout: `${root}/src/previous.ts\n  1:1 error Known baseline rule\n${options.newLint ? '  2:1 error New failure\n' : ''}`, stderr: options.fatalLint ? 'Error: another lint task crashed' : '' };
    if (command === 'github') return { status: 0, stdout: JSON.stringify(options.merged ? {
      state: 'MERGED', headRefOid: args[3], mergeCommit: { oid: args[3] }, url: 'https://github.com/owner/repo/pull/1'
    } : { state: 'WAITING' }), stderr: '' };
    if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') {
      const branch = args[args.indexOf('--head') + 1];
      return { status: 0, stdout: JSON.stringify(prs.filter(p => p.branch === branch)), stderr: '' };
    }
    if (command === 'gh' && args[0] === 'pr' && args[1] === 'create') {
      if (options.failCreate) return { status: 1, stdout: '', stderr: 'temporary network failure' };
      const head = spawnSync('git', ['-c', `safe.directory=${root}`, '-C', settings.cwd ?? root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
      pr = { url: `https://github.com/owner/repo/pull/${prs.length + 1}`, headRefOid: head, state: 'OPEN', branch: args[args.indexOf('--head') + 1] };
      prs.push(pr);
      return { status: 0, stdout: pr.url, stderr: '' };
    }
    if (command === 'gh' && args[0] === 'pr' && args[1] === 'view') return { status: 0, stdout: JSON.stringify(prs.find(p => p.url === args[2])), stderr: '' };
    return { status: 0, stdout: '', stderr: '' };
  };
  const runner = new ReleaseRunner({ root, manifest, execute, docsExecutable: 'codex' });
  return { root, git, base, runner, manifest, calls, merge() {
    pr.state = 'MERGED'; pr.mergeCommit = { oid: pr.headRefOid };
    git('update-ref', 'refs/remotes/origin/main', pr.headRefOid);
  } };
}

test('file selection rejects traversal, secrets, directories and symlinks', t => {
  const { root } = fixture(t);
  assert.equal(validateFile(root, 'src/phase.ts'), 'src/phase.ts');
  for (const name of ['../outside', 'C:/outside', '.git/config', '.env', 'src/', 'src/*', 'graphify-out/cache/index.json'])
    assert.throws(() => validateFile(root, name));
});

test('plan reports excluded edits without mutating Git or running an agent', t => {
  const { runner, git, base, calls } = fixture(t);
  const plan = runner.plan();
  assert.ok(plan.excluded.includes('unrelated.txt'));
  assert.equal(git('rev-parse', 'HEAD'), base);
  assert.equal(git('branch', '--show-current'), 'main');
  assert.equal(calls.some(call => ['codex', 'gh'].includes(call.command)), false);
});

test('docs run in isolation and preserve selected manual comments', t => {
  const { runner, root } = fixture(t);
  writeFileSync(join(root, 'src/previous.ts'), '// comment I added while learning\n');
  runner.commentFiles = ['src/previous.ts'];
  runner.docs();
  assert.match(readFileSync(join(root, 'docs/status.md'), 'utf8'), /documented/);
  assert.match(readFileSync(join(root, 'src/previous.ts'), 'utf8'), /while learning/);
  assert.match(readFileSync(join(root, 'src/phase.ts'), 'utf8'), /value = 2/);
});

test('docs cannot change implementation files or overwrite concurrently edited documentation', t => {
  const { runner, root } = fixture(t, { badDocs: true });
  assert.throws(() => runner.docs(), /outside|protected/);
  assert.equal(readFileSync(join(root, 'docs/status.md'), 'utf8'), 'old docs\n');
});

test('a failed check blocks publication without creating a branch or commit', t => {
  const { runner, git, base } = fixture(t, { failCheck: true });
  runner.docs();
  assert.throws(() => runner.verify(), /check/);
  assert.throws(() => runner.publish(), /verif/i);
  assert.equal(git('rev-parse', 'HEAD'), base);
  assert.equal(git('branch', '--show-current'), 'main');
});

test('publication stages only exact selected files and resumes without duplicate commits or PRs', t => {
  const { runner, git, root, calls } = fixture(t);
  writeFileSync(join(root, 'src/previous.ts'), '// manual comment\n');
  runner.commentFiles = ['src/previous.ts'];
  runner.docs(); runner.verify(); runner.publish(); runner.publish();
  assert.deepEqual(git('show', '--pretty=format:', '--name-only', 'HEAD').split('\n').sort(),
    ['docs/status.md', 'src/phase.ts', 'src/previous.ts']);
  assert.ok(existsSync(join(root, 'unrelated.txt')));
  assert.equal(git('rev-list', '--count', 'HEAD'), '2');
  assert.equal(calls.filter(call => call.command === 'gh' && call.args[1] === 'create').length, 1);
  assert.equal(calls.some(call => call.command === 'gh' && call.args[1] === 'merge'), false);
  assert.equal(runner.state.phasePr, 'https://github.com/owner/repo/pull/1');
});

test('edits after verification and pre-existing staged changes block publication', t => {
  const { runner, root, git } = fixture(t);
  runner.docs(); runner.verify();
  writeFileSync(join(root, 'src/phase.ts'), 'new edit after verification');
  assert.throws(() => runner.publish(), /changed|verif/i);
  runner.verify(); git('add', '--', 'unrelated.txt');
  assert.throws(() => runner.publish(), /staged/i);
});

test('resume cannot regenerate Graphify until the phase PR is actually merged', t => {
  const { runner, calls } = fixture(t);
  runner.docs(); runner.verify(); runner.publish();
  const result = runner.resume();
  assert.equal(result.status, 'awaiting-phase-merge');
  assert.equal(calls.some(call => call.command === 'graphify'), false);
});

test('concurrent manual documentation changes are preserved', t => {
  const { runner, root } = fixture(t, { concurrentDocs: true });
  assert.throws(() => runner.docs(), /concurrently/);
  assert.equal(readFileSync(join(root, 'docs/status.md'), 'utf8'), 'manual concurrent edit');
});

test('merged phase creates isolated Graphify PR, then clean next-phase worktree', t => {
  const { runner, manifest, merge, root } = fixture(t);
  manifest.graphifyRequired = true; manifest.graphifyFiles = ['graphify-out/graph.json'];
  runner.docs(); runner.verify(); runner.publish(); merge();
  assert.equal(runner.resume().status, 'awaiting-graphify-merge');
  assert.equal(runner.resume().status, 'awaiting-graphify-merge');
  merge();
  const next = runner.resume();
  assert.equal(next.status, 'next-phase-ready');
  assert.equal(existsSync(join(next.path, 'unrelated.txt')), false);
  assert.equal(readFileSync(join(root, 'unrelated.txt'), 'utf8'), 'must remain local\n');
  assert.equal(runner.resume().path, next.path);
});

test('Graphify cannot commit unexpected source edits', t => {
  const { runner, manifest, merge } = fixture(t, { unexpectedGraph: true });
  manifest.graphifyRequired = true; manifest.graphifyFiles = ['graphify-out/graph.json'];
  runner.docs(); runner.verify(); runner.publish(); merge();
  assert.throws(() => runner.resume(), /Unexpected Graphify/);
  assert.equal(runner.state.graphCommit, undefined);
});

test('unpublished commits on local main cannot enter the phase PR', t => {
  const { runner, git, root, base, calls } = fixture(t);
  writeFileSync(join(root, 'extra.txt'), 'unrelated committed work');
  git('add', '--', 'extra.txt'); git('commit', '-m', 'unrelated local commit');
  runner.docs(); runner.verify();
  assert.throws(() => runner.publish(), /unrelated commits|outdated base/);
  assert.notEqual(git('rev-parse', 'HEAD'), base);
  assert.equal(git('branch', '--show-current'), 'main');
  assert.equal(calls.some(call => call.command === 'gh' && call.args[1] === 'create'), false);
});

test('manual PR workflow automatically commits selected staged files without GitHub CLI', t => {
  const { runner, manifest, git, calls } = fixture(t);
  manifest.manualPullRequest = true;
  runner.docs(); runner.verify(); git('add', '--', 'src/phase.ts');
  assert.equal(runner.publish().status, 'awaiting-manual-pr-merge');
  runner.publish();
  assert.equal(git('rev-list', '--count', 'HEAD'), '2');
  assert.equal(calls.some(call => call.command === 'gh'), false);
  assert.match(runner.state.compareUrl, /compare\/main/);
});

test('manual PR workflow waits for verified GitHub merge before touching Graphify', t => {
  const { runner, manifest, calls } = fixture(t);
  manifest.manualPullRequest = true; manifest.graphifyPushToMain = true;
  runner.docs(); runner.verify(); runner.publish();
  assert.equal(runner.resume().status, 'awaiting-manual-pr-merge');
  assert.equal(calls.some(call => call.command === 'graphify'), false);
});

test('manual merge refreshes Graphify directly on main and completes without next branch', t => {
  const { runner, manifest, git, calls, root } = fixture(t, { merged: true });
  manifest.manualPullRequest = true; manifest.graphifyPushToMain = true;
  manifest.graphifyRequired = true; manifest.graphifyFiles = ['graphify-out/graph.json'];
  runner.docs(); runner.verify(); runner.publish();
  git('update-ref', 'refs/remotes/origin/main', runner.state.phaseCommit);
  assert.equal(runner.resume().status, 'completed');
  assert.equal(git('branch', '--show-current'), 'main');
  assert.match(git('log', '-1', '--format=%s'), /Refresh Graphify/);
  assert.ok(existsSync(join(root, 'unrelated.txt')));
  assert.equal(calls.some(call => call.command === 'gh'), false);
  assert.equal(git('branch', '--list', manifest.nextBranch), '');
  assert.equal(runner.resume().status, 'completed');
  assert.equal(calls.filter(call => call.command === 'graphify').length, 1);
});

test('only unchanged exact lint baseline is accepted', t => {
  const { runner, manifest } = fixture(t);
  manifest.verification.push({ command: 'lint-check', args: [], name: 'lint', baseline: ['src/previous.ts:1:1 Known baseline rule'] });
  assert.equal(runner.verify().status, 'verified');
});

test('new lint failures and edits to baseline files still block publication', t => {
  const changed = fixture(t);
  changed.manifest.verification.push({ command: 'lint-check', args: [], name: 'lint', baseline: ['src/previous.ts:1:1 Known baseline rule'] });
  writeFileSync(join(changed.root, 'src/previous.ts'), 'changed baseline source');
  assert.throws(() => changed.runner.verify(), /lint/);
  const fresh = fixture(t, { newLint: true });
  fresh.manifest.verification.push({ command: 'lint-check', args: [], name: 'lint', baseline: ['src/previous.ts:1:1 Known baseline rule'] });
  assert.throws(() => fresh.runner.verify(), /lint/);
});

test('GitHub merge lookup requires the exact pushed head and confirmed merged detail', async () => {
  const sha = 'a'.repeat(40);
  const head = { sha, ref: 'codex/phase-10c' }; const base = { ref: 'main' };
  const request = async url => ({ ok: true, json: async () => url.includes('?') ? [{ number: 1, head, base, merged_at: 'today' }] : {
    merged: true, head, base, merge_commit_sha: 'b'.repeat(40), html_url: 'https://github.com/owner/repo/pull/1'
  } });
  assert.equal((await mergedPhase('owner/repo', head.ref, base.ref, sha, request)).state, 'MERGED');
  assert.equal((await mergedPhase('owner/repo', head.ref, base.ref, 'c'.repeat(40), request)).state, 'WAITING');
});

test('matching lint diagnostics do not hide a fatal tool failure', t => {
  const { runner, manifest } = fixture(t, { fatalLint: true });
  manifest.verification.push({ command: 'lint-check', args: [], name: 'lint', baseline: ['src/previous.ts:1:1 Known baseline rule'] });
  assert.throws(() => runner.verify(), /lint/);
});
