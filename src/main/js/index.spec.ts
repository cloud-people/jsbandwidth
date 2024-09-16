import JsBandwidth, { IOptions } from '.';

class FakeJsBandwidth extends JsBandwidth {
    public calculateBandwidth = super.calculateBandwidth;
    public testDownloadSpeed = super.testDownloadSpeed;
}

describe('src/main/js/index.ts', (): void => {
    // const options: IOptions = {
    //     latencyTestUrl: 'http://latency.test',
    //     uploadUrl: 'http://upload.test',
    // };
    const fetch = jasmine.createSpy('fetch');
    const console = jasmine.createSpyObj('console', ['error']);
    const jsBandwidth = new FakeJsBandwidth(fetch, console);

    beforeEach((): void => {
        jasmine.clock().install();
        fetch.calls.reset();
        console.error.calls.reset();
    });

    afterEach((): void => {
        jasmine.clock().uninstall();
    });

    it('#calculateBandwidth', (): void => {
        // SETUP
        const now: Date = new Date(100);
        jasmine.clock().mockDate(now);

        // TEST
        const result: number = jsBandwidth.calculateBandwidth(100, 0);

        // ASSERT
        expect(result).toBe(8000);
    });

    describe('#testDownloadSpeed', (): void => {
        it('ok', async (): Promise<void> => {
            // SETUP
            const now: Date = new Date(100);
            jasmine.clock().mockDate(now);

            const text = 'Lorem ipsum dolor sit amet.';
            const data = jasmine.createSpyObj('data', ['text']);
            data.text.and.returnValue(text);

            const blob = jasmine.createSpy('blob');
            blob.and.returnValue(data);

            fetch.and.resolveTo({
                ok: true,
                blob,
            });

            spyOn(jsBandwidth, 'calculateBandwidth').and.returnValue(8000);

            // TEST
            const url = 'http://download.test';
            const result = await jsBandwidth.testDownloadSpeed(url);

            // ASSERT
            expect(fetch).toHaveBeenCalledWith(
                `${url}?id=100`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'text/plain' },
                },
            );
            expect(blob).toHaveBeenCalled();
            expect(data.text).toHaveBeenCalled();
            expect(jsBandwidth.calculateBandwidth).toHaveBeenCalledWith(text.length, 100);
            expect(result).toEqual({ downloadSpeed: 8000, data: text });
            expect(console.error).not.toHaveBeenCalled();
        });

        it('not ok', async (): Promise<void> => {
            // SETUP
            const now: Date = new Date(100);
            jasmine.clock().mockDate(now);

            const text = 'Lorem ipsum dolor sit amet.';
            const data = jasmine.createSpyObj('data', ['text']);
            data.text.and.returnValue(text);

            const blob = jasmine.createSpy('blob');
            blob.and.returnValue(data);

            const response = { ok: false, blob };
            fetch.and.resolveTo(response);

            spyOn(jsBandwidth, 'calculateBandwidth').and.returnValue(8000);

            // TEST
            const url = 'http://download.test';
            const result = await jsBandwidth.testDownloadSpeed(url);

            // ASSERT
            expect(fetch).toHaveBeenCalledWith(
                `${url}?id=100`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'text/plain' },
                },
            );
            expect(blob).not.toHaveBeenCalled();
            expect(data.text).not.toHaveBeenCalled();
            expect(jsBandwidth.calculateBandwidth).not.toHaveBeenCalled();
            expect(result).toEqual({ downloadSpeed: 0, data: '' });
            expect(console.error).toHaveBeenCalledWith('Error on testDownloadSpeed', response);
        });
    });
});
