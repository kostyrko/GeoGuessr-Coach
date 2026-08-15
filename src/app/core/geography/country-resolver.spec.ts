import {
  COUNTRY_BOUNDARY_DATASET,
  resolveCountry,
  resolveRoundCountries,
} from './country-resolver';

describe('country resolver', () => {
  it('uses the versioned offline dataset for mainland, island, and tiny-country coordinates', () => {
    expect(resolveCountry({ latitude: -24.65, longitude: 25.91 })).toEqual({
      countryCode: 'BWA',
      source: 'boundary',
    });
    expect(resolveCountry({ latitude: 15.12, longitude: -23.61 })).toEqual({
      countryCode: 'CPV',
      source: 'boundary',
    });
    expect(resolveCountry({ latitude: 47.14, longitude: 9.52 })).toEqual({
      countryCode: 'LIE',
      source: 'boundary',
    });
    expect(COUNTRY_BOUNDARY_DATASET.isoRepresentation).toBe('ISO 3166-1 alpha-3');
  });

  it('includes a boundary point consistently and prefers a trusted post-result country', () => {
    // A vertex from Canada's polygon in the pinned offline dataset.
    const borderPoint = { latitude: 45.19, longitude: -67.28 };

    expect(resolveCountry(borderPoint)).toEqual({ countryCode: 'CAN', source: 'boundary' });
    expect(resolveCountry(borderPoint, 'usa')).toEqual({
      countryCode: 'USA',
      source: 'trusted-payload',
    });
  });

  it('keeps unresolved and invalid positions representable', () => {
    expect(resolveCountry(null)).toEqual({ source: 'unresolved' });
    expect(resolveCountry({ latitude: 0, longitude: -140 })).toEqual({ source: 'unresolved' });
    expect(resolveCountry({ latitude: 91, longitude: 0 })).toEqual({ source: 'unresolved' });
  });

  it('resolves actual and guessed countries independently', () => {
    expect(
      resolveRoundCountries(
        { latitude: -24.65, longitude: 25.91 },
        { latitude: 47.14, longitude: 9.52 },
      ),
    ).toEqual({
      actual: { countryCode: 'BWA', source: 'boundary' },
      guess: { countryCode: 'LIE', source: 'boundary' },
    });
  });
});
