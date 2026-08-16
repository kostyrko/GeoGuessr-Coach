import { CountryNamePipe } from './country-name.pipe';

describe('CountryNamePipe', () => {
  const pipe = new CountryNamePipe();

  it('renders ISO alpha-3 codes as English country names', () => {
    expect(pipe.transform('CHE')).toBe('Switzerland');
    expect(pipe.transform('AUT')).toBe('Austria');
  });

  it('keeps unknown codes visible and labels missing resolution honestly', () => {
    expect(pipe.transform('XXX')).toBe('XXX');
    expect(pipe.transform(undefined)).toBe('Unresolved');
  });
});
