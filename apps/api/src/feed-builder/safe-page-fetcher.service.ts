import { Injectable } from '@nestjs/common';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

const MAX_HTML_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 6;

@Injectable()
export class SafePageFetcher {
  async fetchHtml(input: string): Promise<{ url: URL; html: string }> {
    let url = this.parseUrl(input);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      await this.assertPublicTarget(url);
      const response = await fetch(url, {
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'MoreDealsFeedBuilder/1.0 (manual admin extraction)',
        },
        signal: AbortSignal.timeout(12_000),
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location)
          throw new Error('The page returned an invalid redirect.');
        if (redirects === MAX_REDIRECTS) throw new Error('Too many redirects.');
        url = this.parseUrl(new URL(location, url).toString());
        continue;
      }

      if (!response.ok)
        throw new Error(`The page returned HTTP ${response.status}.`);
      const contentType =
        response.headers.get('content-type')?.toLowerCase() ?? '';
      if (
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml')
      ) {
        throw new Error('The URL did not return an HTML page.');
      }
      return { url, html: await this.readLimitedBody(response) };
    }

    throw new Error('The page could not be fetched.');
  }

  private parseUrl(input: string) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new Error('Enter a valid absolute URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported.');
    }
    if (url.username || url.password)
      throw new Error('URLs with credentials are not allowed.');
    if (url.port && !['80', '443'].includes(url.port)) {
      throw new Error('Only standard HTTP and HTTPS ports are allowed.');
    }
    return url;
  }

  private async assertPublicTarget(url: URL) {
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      throw new Error('Local and private network URLs are not allowed.');
    }

    const addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true, verbatim: true });
    if (
      !addresses.length ||
      addresses.some(({ address }) => this.isPrivateIp(address))
    ) {
      throw new Error('Local and private network URLs are not allowed.');
    }
  }

  private isPrivateIp(address: string): boolean {
    const normalized = address.toLowerCase();
    if (normalized.startsWith('::ffff:')) {
      return this.isPrivateIp(normalized.slice(7));
    }
    if (isIP(normalized) === 6) {
      return (
        normalized === '::' ||
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        /^fe[89ab]/.test(normalized)
      );
    }
    const octets = normalized.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet)))
      return true;
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  private async readLimitedBody(response: Response) {
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_HTML_BYTES)
      throw new Error('The HTML page exceeds the 10 MB limit.');
    if (!response.body) return '';

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error('The HTML page exceeds the 10 MB limit.');
      }
      chunks.push(value);
    }

    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(body);
  }
}
