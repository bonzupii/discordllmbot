import Docker, { Container, ContainerCreateOptions } from 'dockerode';
import { logger } from '../../../shared/utils/logger.js';
import { getSandboxConfig } from '../../../shared/config/configLoader.js';

const ALPINE_IMAGE = 'alpine:latest';

const DANGEROUS_PATTERNS = [
    /--privileged/i,
    /--network=host/i,
    /--net=host/i,
    /--volume.*:\//i,
    /-v\s+\/:/i,
    /--ipc=host/i,
    /--pid=host/i,
    /\brm\s+-rf\b/i,
    /\bfdisk\b/i,
    /\bmkfs\b/i,
    /\bdd\s+if=/i,
    /\bkill\s+-9\b/i,
    /\bpkill\s+-9\b/i,
    /\bkillall\b/i,
    /\bexec\s+.*\/bin\/(sh|bash)\b/i,
    /\bchroot\b/i,
    /\bapt-get\s+install\b/i,
    /\byum\s+install\b/i,
    /\bpacman\s+-S\b/i,
    /\bdnf\s+install\b/i,
    /\bwget.*\|.*sh\b/i,
    /\bcurl.*\|.*sh\b/i,
];

let docker: Docker | null = null;

function getDockerClient(): Docker {
    if (!docker) {
        docker = new Docker({
            protocol: 'http',
            host: 'sandbox',
            port: 2375,
        });
    }
    return docker;
}

function validateCommand(rawCommand: string): { valid: boolean; error?: string; command?: string } {
    const trimmed = rawCommand.trim();
    
    if (!trimmed) {
        return { valid: false, error: 'Empty command' };
    }

    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(trimmed)) {
            return { valid: false, error: `Command contains dangerous pattern: ${pattern.source}` };
        }
    }

    const dangerousCommands = ['chroot', 'sudo', 'su ', 'passwd', 'shutdown', 'reboot', 'halt', 'init ', 'telinit'];
    const lowerCmd = trimmed.toLowerCase();
    for (const danger of dangerousCommands) {
        if (lowerCmd.startsWith(danger)) {
            return { valid: false, error: `Command '${danger}' is not allowed` };
        }
    }

    return { valid: true, command: trimmed };
}

export async function isSandboxEnabled(): Promise<boolean> {
    const config = await getSandboxConfig();
    return config.enabled;
}

export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    error?: string;
}

export async function executeInSandbox(userRequest: string): Promise<ExecutionResult> {
    const sandboxConfig = await getSandboxConfig();
    
    if (!sandboxConfig.enabled) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: 1,
            error: 'Sandbox is disabled. Enable it in global config.',
        };
    }

    const validation = validateCommand(userRequest);
    if (!validation.valid) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: 1,
            error: validation.error,
        };
    }

    const dockerClient = getDockerClient();
    const command = validation.command ?? '';

    try {
        logger.info(`Pulling ${ALPINE_IMAGE} into sandbox`);
        try {
            await new Promise<void>((resolve, reject) => {
                dockerClient.pull(ALPINE_IMAGE, (err: Error | null, stream: NodeJS.ReadableStream) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    dockerClient.modem.followProgress(stream, (err: Error | null) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        } catch (pullErr) {
            logger.warn(`Pull failed, trying with existing image: ${pullErr}`);
        }

        const containerName = `sandbox-cmd-${Date.now()}`;
        
        const containerOptions: ContainerCreateOptions = {
            Image: ALPINE_IMAGE,
            name: containerName,
            Cmd: ['sh', '-c', command],
            AttachStdout: true,
            AttachStderr: true,
            HostConfig: {
                Memory: 256 * 1024 * 1024,
                NanoCpus: 500000000,
                AutoRemove: true,
                ReadonlyRootfs: true,
                CapDrop: ['ALL'],
                NetworkMode: 'bridge',
                SecurityOpt: ['no-new-privileges'],
            },
            Env: [],
            Tty: false,
            AttachStdin: false,
        };

        let container: Container;
        try {
            container = await dockerClient.createContainer(containerOptions);
            logger.info(`Created container ${containerName}`);
        } catch (createErr) {
            logger.error('Failed to create container in sandbox', createErr);
            return {
                success: false,
                stdout: '',
                stderr: '',
                exitCode: 1,
                error: `Failed to create container: ${createErr instanceof Error ? createErr.message : String(createErr)}`,
            };
        }

        try {
            await container.start();
            logger.info(`Started container ${containerName}`);
            
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: 500,
            });
            
            const result = await container.wait();
            
            let output = '';
            if (Buffer.isBuffer(logs)) {
                output = logs.toString('utf8');
            } else if (typeof logs === 'string') {
                output = logs;
            }

            const cleanOutput = output.replace(/[\x00-\x08]/g, '').trim();

            logger.info(`Sandbox execution completed with exit code: ${result.StatusCode}`);

            return {
                success: result.StatusCode === 0,
                stdout: cleanOutput.slice(0, 10000),
                stderr: '',
                exitCode: result.StatusCode,
            };
        } catch (execErr) {
            logger.error('Container execution failed', execErr);
            return {
                success: false,
                stdout: '',
                stderr: '',
                exitCode: 1,
                error: `Execution failed: ${execErr instanceof Error ? execErr.message : String(execErr)}`,
            };
        }
    } catch (err) {
        logger.error('Sandbox execution failed', err);
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: 1,
            error: `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

export async function checkSandboxHealth(): Promise<boolean> {
    try {
        const dockerClient = getDockerClient();
        const info = await dockerClient.info();
        return !!info;
    } catch (err) {
        logger.warn('Sandbox health check failed', err);
        return false;
    }
}
