/**
 * ClawHub Service
 * Manages interactions with the ClawHub CLI for skills management
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { app, shell } from 'electron';
import { getOpenClawConfigDir, ensureDir, getClawHubCliBinPath, getClawHubCliEntryPath } from '../utils/paths';

export interface ClawHubSearchParams {
    query: string;
    limit?: number;
}

export interface ClawHubInstallParams {
    slug: string;
    version?: string;
    force?: boolean;
}

export interface ClawHubUninstallParams {
    slug: string;
}

export interface ClawHubSkillResult {
    slug: string;
    name: string;
    description: string;
    version: string;
    author?: string;
    downloads?: number;
    stars?: number;
}

export interface ExploreApiResult {
    items: ClawHubSkillResult[];
    nextCursor: string | null;
}

export class ClawHubService {
    private workDir: string;
    private cliPath: string;
    private cliEntryPath: string;
    private useNodeRunner: boolean;
    private ansiRegex: RegExp;

    constructor() {
        // Use the user's OpenClaw config directory (~/.openclaw) for skill management
        // This avoids installing skills into the project's openclaw submodule
        this.workDir = getOpenClawConfigDir();
        ensureDir(this.workDir);

        const binPath = getClawHubCliBinPath();
        const entryPath = getClawHubCliEntryPath();

        this.cliEntryPath = entryPath;
        if (!app.isPackaged && fs.existsSync(binPath)) {
            this.cliPath = binPath;
            this.useNodeRunner = false;
        } else {
            this.cliPath = process.execPath;
            this.useNodeRunner = true;
        }
        const esc = String.fromCharCode(27);
        const csi = String.fromCharCode(155);
        const pattern = `(?:${esc}|${csi})[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`;
        this.ansiRegex = new RegExp(pattern, 'g');
    }

    private stripAnsi(line: string): string {
        return line.replace(this.ansiRegex, '').trim();
    }

    /**
     * Run a ClawHub CLI command
     */
    private async runCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.useNodeRunner && !fs.existsSync(this.cliEntryPath)) {
                reject(new Error(`ClawHub CLI entry not found at: ${this.cliEntryPath}`));
                return;
            }

            if (!this.useNodeRunner && !fs.existsSync(this.cliPath)) {
                reject(new Error(`ClawHub CLI not found at: ${this.cliPath}`));
                return;
            }

            const commandArgs = this.useNodeRunner ? [this.cliEntryPath, ...args] : args;
            const displayCommand = [this.cliPath, ...commandArgs].join(' ');
            console.log(`Running ClawHub command: ${displayCommand}`);

            const isWin = process.platform === 'win32';
            const env = {
                ...process.env,
                CI: 'true',
                FORCE_COLOR: '0', // Disable colors for easier parsing
            };
            if (this.useNodeRunner) {
                env.ELECTRON_RUN_AS_NODE = '1';
            }
            const child = spawn(this.cliPath, commandArgs, {
                cwd: this.workDir,
                shell: isWin && !this.useNodeRunner,
                env: {
                    ...env,
                    CLAWHUB_WORKDIR: this.workDir,
                },
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('error', (error) => {
                console.error('ClawHub process error:', error);
                reject(error);
            });

            child.on('close', (code) => {
                if (code !== 0 && code !== null) {
                    console.error(`ClawHub command failed with code ${code}`);
                    console.error('Stderr:', stderr);
                    reject(new Error(`Command failed: ${stderr || stdout}`));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    /**
     * Search for skills via HTTP API, with CLI fallback.
     */
    async search(params: ClawHubSearchParams): Promise<ClawHubSkillResult[]> {
        // If query is empty, use 'explore' to show all available skills
        if (!params.query || params.query.trim() === '') {
            const result = await this.exploreApi({ limit: params.limit || 200 });
            return result.items;
        }

        // 1. Try HTTP API search first
        try {
            const results = await this.searchApi(params.query, params.limit);
            if (results.length > 0) return results;
        } catch (error) {
            console.warn('ClawHub HTTP search failed, trying CLI fallback:', error);
        }

        // 2. Fallback: CLI search
        try {
            const results = await this.searchCli(params);
            if (results.length > 0) return results;
        } catch (error) {
            console.warn('ClawHub CLI search failed:', error);
        }

        return [];
    }

    /**
     * Search skills via HTTP API (clawhub.ai)
     */
    private async searchApi(query: string, limit?: number): Promise<ClawHubSkillResult[]> {
        const registry = 'https://clawhub.ai';
        const url = new URL('/api/v1/skills', registry);
        url.searchParams.set('q', query);
        url.searchParams.set('limit', String(limit || 50));

        console.log('[searchApi] Fetching:', url.toString());
        const res = await fetch(url.toString());
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json() as {
            items: Array<{
                slug: string;
                displayName: string;
                summary?: string | null;
                latestVersion?: { version: string } | null;
            }>;
        };

        const mapped = (data.items || []).map(item => ({
            slug: item.slug,
            name: item.displayName || item.slug,
            description: item.summary || '',
            version: item.latestVersion?.version || '0.0.0',
        }));

        // Client-side filter in case the API ignores the q parameter
        const q = query.toLowerCase();
        const filtered = mapped.filter(s =>
            s.slug.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q)
        );
        console.log('[searchApi] total:', mapped.length, 'filtered:', filtered.length);
        return filtered;
    }

    /**
     * Search skills via CLI (original method)
     */
    private async searchCli(params: ClawHubSearchParams): Promise<ClawHubSkillResult[]> {
        const args = ['search', params.query];
        if (params.limit) {
            args.push('--limit', String(params.limit));
        }

        const output = await this.runCommand(args);
        if (!output || output.includes('No skills found')) {
            return [];
        }

        const lines = output.split('\n').filter(l => l.trim());
        return lines.map(line => {
            const cleanLine = this.stripAnsi(line);

            // Format could be: slug vversion description (score)
            // Or sometimes: slug  vversion  description
            const match = cleanLine.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+)$/);
            if (match) {
                const slug = match[1];
                const version = match[2];
                let description = match[3];

                // Clean up score if present at the end
                description = description.replace(/\(\d+\.\d+\)$/, '').trim();

                return {
                    slug,
                    name: slug,
                    version,
                    description,
                };
            }
            return null;
        }).filter((s): s is ClawHubSkillResult => s !== null);
    }

    /**
     * Explore trending skills (CLI fallback)
     */
    async explore(params: { limit?: number } = {}): Promise<ClawHubSkillResult[]> {
        try {
            const args = ['explore'];
            if (params.limit) {
                args.push('--limit', String(params.limit));
            }

            const output = await this.runCommand(args);
            if (!output) return [];

            const lines = output.split('\n').filter(l => l.trim());
            return lines.map(line => {
                const cleanLine = this.stripAnsi(line);

                // Format: slug vversion time description
                // Example: my-skill v1.0.0 2 hours ago A great skill
                const match = cleanLine.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+? ago|just now|yesterday)\s+(.+)$/i);
                if (match) {
                    return {
                        slug: match[1],
                        name: match[1],
                        version: match[2],
                        description: match[4],
                    };
                }
                return null;
            }).filter((s): s is ClawHubSkillResult => s !== null);
        } catch (error) {
            console.error('ClawHub explore error:', error);
            return [];
        }
    }

    /**
     * Explore skills via HTTP API with cursor pagination.
     * Bypasses CLI limit of 200 to load all skills.
     */
    async exploreApi(params: { cursor?: string; limit?: number; sort?: string } = {}): Promise<ExploreApiResult> {
        const registry = 'https://clawhub.ai';
        const limit = Math.min(params.limit || 200, 200);
        const url = new URL('/api/v1/skills', registry);
        url.searchParams.set('limit', String(limit));
        if (params.cursor) {
            url.searchParams.set('cursor', params.cursor);
        }
        if (params.sort) {
            url.searchParams.set('sort', params.sort);
        }

        try {
            console.log('[exploreApi] Fetching:', url.toString());
            const res = await fetch(url.toString());
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const data = await res.json() as {
                items: Array<{
                    slug: string;
                    displayName: string;
                    summary?: string | null;
                    latestVersion?: { version: string } | null;
                    updatedAt?: number;
                }>;
                nextCursor: string | null;
            };

            console.log('[exploreApi] items:', data.items?.length, 'nextCursor:', data.nextCursor ? data.nextCursor.substring(0, 30) + '...' : null);

            const items: ClawHubSkillResult[] = data.items.map(item => ({
                slug: item.slug,
                name: item.slug,
                description: item.summary || '',
                version: item.latestVersion?.version || '0.0.0',
            }));

            return { items, nextCursor: data.nextCursor };
        } catch (error) {
            console.error('[exploreApi] error:', error);
            return { items: [], nextCursor: null };
        }
    }

    /**
     * Install a skill
     */
    async install(params: ClawHubInstallParams): Promise<void> {
        const args = ['install', params.slug];

        if (params.version) {
            args.push('--version', params.version);
        }

        if (params.force) {
            args.push('--force');
        }

        const output = await this.runCommand(args);
        console.log(`ClawHub install output for ${params.slug}:`, output);

        // Verify the skill directory was actually created
        const skillDir = path.join(this.workDir, 'skills', params.slug);
        if (!fs.existsSync(skillDir)) {
            console.error(`Skill install verification failed: directory not found at ${skillDir}`);
            throw new Error(`Install appeared to succeed but skill directory was not created. The skill "${params.slug}" may not be available on the registry.`);
        }
    }

    /**
     * Uninstall a skill
     */
    async uninstall(params: ClawHubUninstallParams): Promise<void> {
        const fsPromises = fs.promises;

        // 1. Delete the skill directory
        const skillDir = path.join(this.workDir, 'skills', params.slug);
        if (fs.existsSync(skillDir)) {
            console.log(`Deleting skill directory: ${skillDir}`);
            await fsPromises.rm(skillDir, { recursive: true, force: true });
        }

        // 2. Remove from lock.json
        const lockFile = path.join(this.workDir, '.clawhub', 'lock.json');
        if (fs.existsSync(lockFile)) {
            try {
                const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
                if (lockData.skills && lockData.skills[params.slug]) {
                    console.log(`Removing ${params.slug} from lock.json`);
                    delete lockData.skills[params.slug];
                    await fsPromises.writeFile(lockFile, JSON.stringify(lockData, null, 2));
                }
            } catch (err) {
                console.error('Failed to update ClawHub lock file:', err);
            }
        }
    }

    /**
     * List installed skills
     */
    async listInstalled(): Promise<Array<{ slug: string; version: string }>> {
        let results: Array<{ slug: string; version: string }> = [];

        // 1. Try CLI list command
        try {
            const output = await this.runCommand(['list']);
            if (output && !output.includes('No installed skills')) {
                const lines = output.split('\n').filter(l => l.trim());
                results = lines.map(line => {
                    const cleanLine = this.stripAnsi(line);
                    const match = cleanLine.match(/^(\S+)\s+v?(\d+\.\S+)/);
                    if (match) {
                        return {
                            slug: match[1],
                            version: match[2],
                        };
                    }
                    return null;
                }).filter((s): s is { slug: string; version: string } => s !== null);
            }
        } catch (error) {
            console.error('ClawHub list error:', error);
        }

        // 2. Use filesystem as source of truth: only report skills that exist on disk.
        //    lock.json may contain stale entries from failed installs.
        const diskResults = this.listInstalledFromDisk();
        const diskSlugs = new Set(diskResults.map(d => d.slug));

        // Keep CLI results only if the directory exists on disk (prefer CLI version info)
        const verified = results.filter(r => diskSlugs.has(r.slug));

        // Add any disk-only skills not in CLI results
        for (const disk of diskResults) {
            if (!verified.some(r => r.slug === disk.slug)) {
                verified.push(disk);
            }
        }

        return verified;
    }

    /**
     * Scan the skills directory on disk to find installed skills.
     * Used as fallback when the CLI list command returns empty.
     */
    private listInstalledFromDisk(): Array<{ slug: string; version: string }> {
        const skillsDir = path.join(this.workDir, 'skills');
        if (!fs.existsSync(skillsDir)) return [];

        try {
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
            return entries
                .filter(e => e.isDirectory())
                .map(e => {
                    let version = 'unknown';
                    // Try reading version from package.json
                    const pkgPath = path.join(skillsDir, e.name, 'package.json');
                    if (fs.existsSync(pkgPath)) {
                        try {
                            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                            if (pkg.version) version = pkg.version;
                        } catch { /* ignore */ }
                    }
                    return { slug: e.name, version };
                })
                .filter(s => s.slug !== '.clawhub'); // exclude metadata dir
        } catch (error) {
            console.error('listInstalledFromDisk error:', error);
            return [];
        }
    }

    /**
     * Open skill README/manual in default editor
     */
    async openSkillReadme(slug: string): Promise<boolean> {
        const skillDir = path.join(this.workDir, 'skills', slug);

        // Try to find documentation file
        const possibleFiles = ['SKILL.md', 'README.md', 'skill.md', 'readme.md'];
        let targetFile = '';

        for (const file of possibleFiles) {
            const filePath = path.join(skillDir, file);
            if (fs.existsSync(filePath)) {
                targetFile = filePath;
                break;
            }
        }

        if (!targetFile) {
            // If no md file, just open the directory
            if (fs.existsSync(skillDir)) {
                targetFile = skillDir;
            } else {
                throw new Error('Skill directory not found');
            }
        }

        try {
            // Open file with default application
            await shell.openPath(targetFile);
            return true;
        } catch (error) {
            console.error('Failed to open skill readme:', error);
            throw error;
        }
    }
}
