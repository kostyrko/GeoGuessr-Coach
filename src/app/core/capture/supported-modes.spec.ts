import { SUPPORTED_MODES, UNSUPPORTED_MODES } from './supported-modes';

describe('supported capture modes', () => {
  it('enables automatic collection only for the validated Daily Challenge Free mode', () => {
    expect(SUPPORTED_MODES).toEqual([
      expect.objectContaining({
        automaticCollection: true,
        mode: 'daily-challenge-free',
        supportStatus: 'supported',
      }),
    ]);
  });

  it('marks unvalidated game modes as unsupported', () => {
    expect(UNSUPPORTED_MODES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: 'single-player', supportStatus: 'unsupported' }),
        expect.objectContaining({ mode: 'competitive', supportStatus: 'unsupported' }),
      ]),
    );
  });
});
