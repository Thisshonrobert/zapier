import { existsSync, readFileSync, writeFileSync, mkdirSync, lstatSync, copyFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, join, dirname, isAbsolute } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export function validateFile(root, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || isAbsolute(name) || /[:*?\r\n]/.test(name)
    || name.split('/').some(p => !p || p === '.' || p === '..')
    || /(^|\/)(\.git|\.agents|\.codex|\.env[^/]*)(\/|$)/.test(name)
    || /^graphify-out\/(cache|memory)\//.test(name)) throw new Error(`Unsafe file: ${name}`);
  let cursor = resolve(root);
  for (const part of name.split('/')) {
    cursor = join(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error(`Symlink: ${name}`);
  }
  if (existsSync(cursor) && !lstatSync(cursor).isFile()) throw new Error(`Not a file: ${name}`);
  return name;
}

function nativeExecute(command, args, settings = {}) {
  if (command === 'github') return spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'github-state.mjs'), ...args], {
    cwd: settings.cwd, encoding: 'utf8', timeout: 30000, env: process.env,
  });
  return spawnSync('rtk', ['proxy', command, ...args], {
    cwd: settings.cwd, input: settings.input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 10 * 60 * 1000,
    env: { ...process.env, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude') },
  });
}

export function lintErrors(output, root) {
  let file;
  const errors = [];
  for (let line of output.split('\n')) {
    line = line.replace(/^frontend:lint:\s?/, '').trimEnd();
    const normalized = line.trim().replaceAll('\\', '/');
    const prefix = root.replaceAll('\\', '/') + '/';
    if (normalized.startsWith(prefix)) {
      file = normalized.slice(prefix.length).replace(/:\d+:\d+$/, '');
      continue;
    }
    const match = line.match(/^\s*(\d+):(\d+)\s+error\s+(.+)$/);
    if (match) errors.push(`${file}:${match[1]}:${match[2]} ${match[3].trim().replace(/\s+/g, ' ')}`);
  }
  return errors.sort();
}

function unexpectedLintFailure(output) {
  return output.split('\n').some(raw => {
    const line = raw.trim();
    if (!/\b(error|failed|fatal|exception|crash|timeout|timed out|ENOENT|EACCES|EPERM|ETIMEDOUT|SyntaxError|TypeError|ReferenceError)\b/i.test(line)) return false;
    if (/^(?:frontend:lint:\s*)?\d+:\d+\s+error\s+/.test(line)) return false;
    if (/^(?:frontend:lint:\s*)?error: script "lint" exited with code 1$/.test(line)) return false;
    if (/^frontend:lint: ERROR: command finished with error: command .* run lint exited \(1\)$/.test(line)) return false;
    if (/^frontend#lint: command .* run lint exited \(1\)$/.test(line)) return false;
    if (/^ERROR\s+run failed: command\s+exited \(1\)$/.test(line)) return false;
    if (/^Failed:\s+frontend#lint$/.test(line)) return false;
    return true;
  });
}

export class ReleaseRunner {
  constructor({ root, manifest, execute = nativeExecute, docsExecutable = 'codex', commentFiles = [], autoMerge = false }) {
    this.root = resolve(root); this.manifest = manifest; this.execute = execute;
    this.docsExecutable = docsExecutable; this.commentFiles = commentFiles; this.autoMerge = autoMerge;
    this.directory = join(this.root, '.agents/progress/releases', manifest.phase.toLowerCase());
    this.statePath = join(this.directory, 'state.json');
    this.state = existsSync(this.statePath) ? JSON.parse(readFileSync(this.statePath, 'utf8')) : {};
    if (!/^codex\/[a-zA-Z0-9._/-]+$/.test(manifest.branch) || !/^codex\/[a-zA-Z0-9._/-]+$/.test(manifest.nextBranch))
      throw new Error('Release and next branches must use the codex/ prefix');
  }
  save() {
    mkdirSync(this.directory, { recursive: true });
    const temporary = `${this.statePath}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(this.state, null, 2)); renameSync(temporary, this.statePath);
  }
  run(command, args, cwd = this.root, input) {
    const result = this.execute(command, args, { cwd, input });
    this.lastResult = result;
    if (command === 'codex') {
      mkdirSync(this.directory, { recursive: true });
      writeFileSync(join(this.directory, 'documentation-agent.log'), `${result.stdout || ''}\n${result.stderr || ''}`);
    }
    if (result.status !== 0) {
      mkdirSync(this.directory, { recursive: true });
      writeFileSync(join(this.directory, 'last-error.log'), `${result.stdout || ''}\n${result.stderr || result.error || ''}`);
      throw new Error(`${command} ${args[0] || ''} failed; see ${join(this.directory, 'last-error.log')}`);
    }
    return (result.stdout || '').trim();
  }
  git(args, cwd = this.root) { return this.run('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/')}`, ...args], cwd); }
  files() { return [...new Set([...this.manifest.implementation, ...this.manifest.documentation, ...this.commentFiles])].map(p => validateFile(this.root, p)); }
  hash(root, file) { return existsSync(join(root, file)) ? createHash('sha256').update(readFileSync(join(root, file))).digest('hex') : null; }
  digest() { return JSON.stringify(this.files().map(p => [p, this.hash(this.root, p)])); }
  dirty(cwd = this.root) {
    return [...new Set((this.git(['diff', '--name-only', 'HEAD', '-z'], cwd) + '\0' +
      this.git(['ls-files', '--others', '--exclude-standard', '-z'], cwd)).split('\0').filter(Boolean))];
  }
  graphChanges(cwd) {
    return this.dirty(cwd).filter(p => !/^graphify-out\/(cache|memory)\//.test(p)
      && !['graphify-out/.graphify_root', 'graphify-out/.graphify_python'].includes(p));
  }
  plan() {
    const selected = this.files(); const dirty = this.dirty();
    return { phase: this.manifest.phase, branch: this.manifest.branch,
      implementation: this.manifest.implementation, learningComments: this.commentFiles,
      documentation: this.manifest.documentation, selected: dirty.filter(p => selected.includes(p)),
      excluded: dirty.filter(p => !selected.includes(p)), graphifyRequired: this.manifest.graphifyRequired };
  }
  docs() {
    const docs = this.manifest.documentation.map(p => validateFile(this.root, p));
    const initial = new Map(docs.map(p => [p, this.hash(this.root, p)]));
    const worktree = join(this.directory, `docs-${randomUUID()}`);
    mkdirSync(this.directory, { recursive: true });
    this.git(['worktree', 'add', '--detach', worktree, 'HEAD']);
    try {
      for (const p of this.files()) {
        if (!existsSync(join(this.root, p))) throw new Error(`Missing selected file: ${p}`);
        mkdirSync(dirname(join(worktree, p)), { recursive: true }); copyFileSync(join(this.root, p), join(worktree, p));
      }
      const protectedFiles = this.files().filter(p => !docs.includes(p));
      const protectedHashes = new Map(protectedFiles.map(p => [p, this.hash(worktree, p)]));
      const allowedBefore = new Set(this.dirty(worktree));
      const prompt = `Update ONLY these documentation files: ${docs.join(', ')}. Read only the selected implementation files: ${protectedFiles.join(', ')} and existing documentation. Preserve limitations and do not alter code, comments, Git, Graphify, or other files. Handoff:\n${readFileSync(resolve(this.root, this.manifest.handoff), 'utf8')}`;
      if (this.docsExecutable !== 'codex') throw new Error('This version supports Codex docs; use Docs mode with Codex or update docs manually and run Verify.');
      this.run('codex', ['exec', '--ephemeral', '-m', this.manifest.docsModel || 'gpt-5.6-luna',
        '-c', 'model_reasoning_effort="low"', '-s', 'workspace-write', '-C', worktree, '-'], worktree, prompt);
      if (this.dirty(worktree).some(p => !docs.includes(p) && !allowedBefore.has(p))
        || protectedFiles.some(p => this.hash(worktree, p) !== protectedHashes.get(p)))
        throw new Error('Documentation agent changed outside allowed documentation or protected files');
      for (const p of docs) {
        validateFile(worktree, p);
        if (this.hash(this.root, p) !== initial.get(p)) throw new Error(`Documentation changed concurrently: ${p}`);
        if (!existsSync(join(worktree, p))) throw new Error(`Documentation removed: ${p}`);
      }
      for (const p of docs) { mkdirSync(dirname(join(this.root, p)), { recursive: true }); copyFileSync(join(worktree, p), join(this.root, p)); }
      this.state.verified = null; this.save();
    } finally { this.git(['worktree', 'remove', '--force', worktree]); }
    return this.plan();
  }
  verify() {
    this.state.verified = null; this.save();
    const head = this.git(['rev-parse', 'HEAD']); const digest = this.digest();
    const failures = [];
    const results = [];
    for (const check of this.manifest.verification) {
      try { this.run(check.command, check.args); results.push({ name: check.name, passed: true }); } catch (error) {
        if (check.baseline) {
          const status = this.lastResult?.status;
          const output = readFileSync(join(this.directory, 'last-error.log'), 'utf8');
          const expected = [...check.baseline].sort();
          const actual = lintErrors(output, this.root);
          const files = [...new Set(expected.map(p => p.split(':')[0]))];
          files.forEach(p => validateFile(this.root, p));
          if (status === 1 && !unexpectedLintFailure(output) && actual.length && JSON.stringify(actual) === JSON.stringify(expected)
            && !this.git(['diff', 'HEAD', '--name-only', '--', ...files])) {
            results.push({ name: check.name, passed: true, baselineUnchanged: true, existingErrors: actual.length });
            continue;
          }
        }
        results.push({ name: check.name, passed: false });
        failures.push(`${check.name}: ${error.message}`);
        const log = join(this.directory, 'last-error.log');
        if (existsSync(log)) copyFileSync(log, join(this.directory, `check-${check.name.replace(/[^a-z0-9]/gi, '-')}.log`));
      }
    }
    writeFileSync(join(this.directory, 'verification-results.json'), JSON.stringify(results, null, 2));
    if (failures.length) throw new Error(failures.join('\n'));
    if (digest !== this.digest() || head !== this.git(['rev-parse', 'HEAD'])) throw new Error('Files changed during verification');
    this.state.verified = { head, digest, configuration: JSON.stringify(this.manifest) }; this.save();
    return { status: 'verified' };
  }
  publish() {
    const verified = this.state.verified;
    if (!verified || verified.digest !== this.digest() || verified.configuration !== JSON.stringify(this.manifest)) throw new Error('Files changed or verification missing; run Verify');
    const head = this.git(['rev-parse', 'HEAD']);
    if (head !== (this.state.phaseCommit || verified.head)) throw new Error('HEAD changed after verification');
    const staged = this.git(['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
    if (staged.some(p => !this.files().includes(p)) || (staged.length && !this.manifest.manualPullRequest))
      throw new Error('Pre-existing unrelated staged changes must be resolved first');
    if (!this.manifest.manualPullRequest) this.run('gh', ['auth', 'status']);
    if (!this.state.phaseCommit) {
      this.git(['fetch', 'origin', this.manifest.baseBranch]);
      if (head !== this.git(['rev-parse', `origin/${this.manifest.baseBranch}`]))
        throw new Error('Local HEAD differs from updated origin/main; unrelated commits or an outdated base must be resolved before publication');
      const branch = this.git(['branch', '--show-current']);
      if (branch !== this.manifest.branch) {
        if (branch !== this.manifest.baseBranch) throw new Error(`Expected ${this.manifest.baseBranch} or ${this.manifest.branch}`);
        this.git(['switch', '-c', this.manifest.branch]);
      }
      const changed = this.plan().selected;
      if (!changed.length) throw new Error('No selected changes');
      this.git(['add', '--', ...changed]);
      this.git(['commit', '-m', this.manifest.title]);
      this.state.phaseCommit = this.git(['rev-parse', 'HEAD']); this.save();
    }
    if (this.git(['branch', '--show-current']) !== this.manifest.branch) throw new Error('Release branch is no longer checked out');
    this.git(['push', '-u', 'origin', this.manifest.branch]);
    if (this.manifest.manualPullRequest) {
      this.state.compareUrl = `https://github.com/${this.manifest.repository}/compare/${encodeURIComponent(this.manifest.baseBranch)}...${encodeURIComponent(this.manifest.branch)}?expand=1`;
      this.save(); return { status: 'awaiting-manual-pr-merge', url: this.state.compareUrl };
    }
    if (!this.state.phasePr) {
      const prs = JSON.parse(this.run('gh', ['pr', 'list', '--repo', this.manifest.repository, '--head', this.manifest.branch, '--base', this.manifest.baseBranch, '--state', 'all', '--json', 'url,headRefOid,state']));
      const existing = prs.find(p => p.headRefOid === this.state.phaseCommit && p.state !== 'CLOSED');
      this.state.phasePr = existing?.url || this.run('gh', ['pr', 'create', '--repo', this.manifest.repository, '--base', this.manifest.baseBranch, '--head', this.manifest.branch, '--title', this.manifest.title, '--body', `Phase ${this.manifest.phase}: implementation, selected learning comments and documentation. Local manifest verification passed.`]);
      this.save();
    }
    if (this.autoMerge) this.run('gh', ['pr', 'merge', this.state.phasePr, '--auto', '--squash', '--match-head-commit', this.state.phaseCommit]);
    return { status: 'awaiting-phase-merge', url: this.state.phasePr };
  }
  resume() {
    if (this.manifest.manualPullRequest) return this.resumeManual();
    if (!this.state.phasePr) throw new Error('Publish the phase PR first');
    const pr = JSON.parse(this.run('gh', ['pr', 'view', this.state.phasePr, '--json', 'state,headRefOid,mergeCommit']));
    if (pr.state !== 'MERGED') return { status: 'awaiting-phase-merge', url: this.state.phasePr };
    if (pr.headRefOid !== this.state.phaseCommit) throw new Error('PR head differs from verified phase commit');
    this.git(['fetch', 'origin', this.manifest.baseBranch]);
    const next = join(this.directory, 'next-phase');
    if (this.manifest.graphifyRequired) {
      if (!this.state.graphPr) {
        const tree = join(this.directory, 'graphify'); const branch = `codex/graphify-phase-${this.manifest.phase.toLowerCase()}`;
        if (!existsSync(tree)) this.git(['worktree', 'add', '-b', branch, tree, `origin/${this.manifest.baseBranch}`]);
        if (this.dirty(tree).length) throw new Error('Graphify worktree has changes; inspect before retrying');
        this.git(['merge-base', '--is-ancestor', pr.mergeCommit.oid, 'HEAD'], tree);
        if (!this.state.graphCommit) {
          this.run('graphify', ['update', '.'], tree);
          const changed = this.dirty(tree); const allowed = this.manifest.graphifyFiles || [];
          if (changed.some(p => !allowed.includes(p))) throw new Error(`Unexpected Graphify changes: ${changed.filter(p => !allowed.includes(p)).join(', ')}`);
          if (!changed.length) throw new Error('Graphify produced no tracked changes; inspect the refresh');
          changed.forEach(p => validateFile(tree, p));
          this.git(['add', '--', ...changed], tree); this.git(['commit', '-m', `Refresh Graphify after phase ${this.manifest.phase}`], tree);
          this.state.graphCommit = this.git(['rev-parse', 'HEAD'], tree); this.save();
        }
        if (this.git(['rev-parse', 'HEAD'], tree) !== this.state.graphCommit) throw new Error('Graphify HEAD changed; inspect before retrying');
        this.git(['push', '-u', 'origin', branch], tree);
        const existing = JSON.parse(this.run('gh', ['pr', 'list', '--repo', this.manifest.repository, '--head', branch, '--base', this.manifest.baseBranch, '--state', 'all', '--json', 'url,headRefOid,state'], tree))
          .find(p => p.headRefOid === this.state.graphCommit && p.state !== 'CLOSED');
        this.state.graphPr = existing?.url || this.run('gh', ['pr', 'create', '--repo', this.manifest.repository, '--head', branch, '--base', this.manifest.baseBranch, '--title', `Refresh Graphify after phase ${this.manifest.phase}`, '--body', 'Structural Graphify refresh from the merged phase. Existing semantic extraction is reused.'], tree);
        this.save(); return { status: 'awaiting-graphify-merge', url: this.state.graphPr };
      }
      const graphPr = JSON.parse(this.run('gh', ['pr', 'view', this.state.graphPr, '--json', 'state,headRefOid,mergeCommit']));
      if (graphPr.state !== 'MERGED') return { status: 'awaiting-graphify-merge', url: this.state.graphPr };
      if (graphPr.headRefOid !== this.state.graphCommit) throw new Error('Graphify PR head changed');
      this.git(['fetch', 'origin', this.manifest.baseBranch]);
      this.git(['merge-base', '--is-ancestor', graphPr.mergeCommit.oid, `origin/${this.manifest.baseBranch}`]);
    }
    if (!existsSync(next)) this.git(['worktree', 'add', '-b', this.manifest.nextBranch, next, `origin/${this.manifest.baseBranch}`]);
    this.git(['merge-base', '--is-ancestor', pr.mergeCommit.oid, 'HEAD'], next);
    if (this.dirty(next).length || this.git(['branch', '--show-current'], next) !== this.manifest.nextBranch) throw new Error('Next phase worktree changed; inspect before continuing');
    return { status: 'next-phase-ready', path: next, branch: this.manifest.nextBranch };
  }
  resumeManual() {
    if (!this.state.phaseCommit) throw new Error('Publish the phase branch first');
    const pr = JSON.parse(this.run('github', [this.manifest.repository, this.manifest.branch, this.manifest.baseBranch, this.state.phaseCommit]));
    if (pr.state !== 'MERGED') return { status: 'awaiting-manual-pr-merge', url: this.state.compareUrl };
    this.state.phasePr = pr.url; this.save();
    this.git(['fetch', 'origin', this.manifest.baseBranch]);
    this.git(['merge-base', '--is-ancestor', pr.mergeCommit.oid, `origin/${this.manifest.baseBranch}`]);
    // Carry unrelated local edits normally; never stash or reset them.
    if (this.git(['branch', '--show-current']) !== this.manifest.baseBranch)
      this.git(['switch', this.manifest.baseBranch]);
    this.git(['pull', '--ff-only', 'origin', this.manifest.baseBranch]);
    if (this.state.graphComplete || !this.manifest.graphifyRequired) return { status: 'completed', branch: this.manifest.baseBranch };
    const tree = join(this.directory, 'graphify-main');
    if (!existsSync(tree)) this.git(['worktree', 'add', '--detach', tree, `origin/${this.manifest.baseBranch}`]);
    if (!this.state.graphCommit) {
      if (this.dirty(tree).length) throw new Error('Graphify worktree is dirty; inspect before retrying');
      this.git(['fetch', 'origin', this.manifest.baseBranch]);
      if (this.git(['rev-parse', 'HEAD'], tree) !== this.git(['rev-parse', `origin/${this.manifest.baseBranch}`]))
        throw new Error('Graphify worktree base changed; inspect before retrying');
      this.run('graphify', ['update', '.'], tree);
      const changed = this.graphChanges(tree);
      const unexpected = changed.filter(p => !(this.manifest.graphifyFiles || []).includes(p));
      if (unexpected.length) throw new Error(`Unexpected Graphify changes: ${unexpected.join(', ')}`);
      if (changed.length) {
        changed.forEach(p => validateFile(tree, p));
        this.git(['add', '--', ...changed], tree);
        this.git(['commit', '-m', `Refresh Graphify after phase ${this.manifest.phase}`], tree);
        this.state.graphCommit = this.git(['rev-parse', 'HEAD'], tree); this.save();
      } else { this.state.graphComplete = true; this.save(); return { status: 'completed', branch: this.manifest.baseBranch, graphify: 'already-current' }; }
    }
    if (this.graphChanges(tree).length || this.git(['rev-parse', 'HEAD'], tree) !== this.state.graphCommit)
      throw new Error('Graphify worktree changed after commit');
    this.git(['push', 'origin', `HEAD:refs/heads/${this.manifest.baseBranch}`], tree);
    this.git(['pull', '--ff-only', 'origin', this.manifest.baseBranch]);
    this.git(['merge-base', '--is-ancestor', this.state.graphCommit, 'HEAD']);
    this.state.graphComplete = true; this.save();
    return { status: 'completed', branch: this.manifest.baseBranch, graphCommit: this.state.graphCommit };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let lock;
  let lockPath;
  try {
    const [mode = 'Plan', phase = '10c', ...comments] = process.argv.slice(2);
    if (!/^[a-z0-9]+$/i.test(phase)) throw new Error('Invalid phase');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const manifest = JSON.parse(readFileSync(join(root, 'scripts/phases', `${phase.toLowerCase()}.json`), 'utf8'));
    const runner = new ReleaseRunner({ root, manifest, commentFiles: comments });
    if (mode.toLowerCase() !== 'plan') {
      mkdirSync(runner.directory, { recursive: true }); lockPath = join(runner.directory, 'release.lock');
      try { lock = openSync(lockPath, 'wx'); writeFileSync(lock, String(process.pid)); }
      catch { throw new Error(`Another release operation may be running. Inspect ${lockPath} before removing a stale lock.`); }
    }
    let result;
    switch (mode.toLowerCase()) {
      case 'plan': result = runner.plan(); break;
      case 'docs': result = runner.docs(); break;
      case 'verify': result = runner.verify(); break;
      case 'prepare': runner.docs(); result = runner.verify(); break;
      case 'start': runner.docs(); runner.verify(); result = runner.publish(); break;
      case 'publish': result = runner.publish(); break;
      case 'resume': result = runner.resume(); break;
      default: throw new Error('Mode must be Plan, Docs, Verify, Prepare, Start, Publish, or Resume');
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); } }
}
