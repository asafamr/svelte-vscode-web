// imports mocha for the browser, defining the `mocha` global.
require('mocha/mocha');

export function run(): Promise<void> {

	return new Promise(async (c, e) => {
		mocha.setup({
			ui: 'tdd',
			reporter: undefined,
			timeout:20000
		});

		await import('./extension.test')

		try {
			// Run the mocha test
			mocha.run(failures => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (err) {
			console.error(err);
			e(err);
		}
	});
}
