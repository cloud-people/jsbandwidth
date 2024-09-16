export interface IOptions {
	downloadUrl: string;
	latencyTestUrl: string;
	uploadUrl: string;
}

export default class JsBandwidth {
	private options: IOptions;

	public constructor(
		private readonly fetch: typeof window.fetch,
		private readonly console: typeof window.console,
	) {
		const defaultOptions = {
			latencyTestUrl: "/test",
			downloadUrl: "/test.bin",
			uploadUrl: "/post",
			uploadDataSize: 5 * 1024 * 1024,
			uploadDataMaxSize: Number.MAX_VALUE,
		};

		this.options = { ...defaultOptions };
	}

	/**
	 * Calculates the bandwidth in bps (bits per second).
	 * @param size the size in bytes to be transfered.
	 * @param start the time when the transfer started. The end time is considered to be now.
	 */
	protected calculateBandwidth(size: number, start: number): number {
		const now: number = new Date().getTime();
		return (size * 8) / ((now - start) / 1000);
	}

	protected async testDownloadSpeed(url: string): Promise<{ data: string, downloadSpeed: number }> {
		const start: number = new Date().getTime();
		const response = await this.fetch(
			`${url}?id=${start}`,
			{
				method: 'GET',
				headers: { 'Content-Type': 'text/plain' },
			},
		);

		if (response.ok) {
			const data: Blob = await response.blob();
			const text: string = await data.text();
			const downloadSpeed: number = this.calculateBandwidth(text.length, start);
			return { downloadSpeed, data: text };
		}

		this.console.error('Error on testDownloadSpeed', response);
		return {
			downloadSpeed: 0,
			data: '',
		};
	}

	private async testUploadSpeed(url: string, data: string): Promise<number> {
		const start: number = new Date().getTime();
		const oneMegabyte = 1048576;
		const truncatedData: string = data.substring(0, oneMegabyte);
		const response = await this.fetch(
			`${url}?id=${start}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/octet-stream' },
				body: truncatedData,
			},
		);

		if (response.ok) {
			const uploadSpeed: number = this.calculateBandwidth(data.length, start);
			return uploadSpeed;
		}

		this.console.error('Error on testUploadSpeed', response);
		return 0;
	}

	private async testLatency(url: string): Promise<number> {
		const start: number = new Date().getTime();
		const response = await this.fetch(
			`${url}?id=${start}`, {
				method: 'HEAD',
				headers: { 'Content-Type': 'application/octet-stream' },
			},
		);

		if (response.ok) {
			const now: number = new Date().getTime();
			const latency: number = (now - start) / 2;
			return latency;
		}

		this.console.error('Error on testLatency', response);
		return 0;
	}

	public async testSpeed(opts: IOptions): Promise<{ latency: number, downloadSpeed: number, uploadSpeed: number }> {
		try {
			const options: IOptions = { ...this.options, ...opts };

			const latencyTestUrl: string = options.latencyTestUrl || options.downloadUrl;
			const latency: number = await this.testLatency(latencyTestUrl);

			const downloadResult = await this.testDownloadSpeed(options.downloadUrl);

			const uploadSpeed: number = await this.testUploadSpeed(options.uploadUrl, downloadResult.data);

			return {
				latency,
				downloadSpeed: downloadResult.downloadSpeed,
				uploadSpeed,
			};
		}
		catch (e) {
			this.console.error('Error on testSpeed', e);
			return {
				latency: 0,
				downloadSpeed: 0,
				uploadSpeed: 0,
			};
		}
	}
}
