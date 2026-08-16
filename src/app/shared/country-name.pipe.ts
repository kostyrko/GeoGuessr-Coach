import { Pipe, type PipeTransform } from '@angular/core';
import { getName, registerLocale } from 'i18n-iso-countries';
import englishCountryNames from 'i18n-iso-countries/langs/en.json';

registerLocale(englishCountryNames);

@Pipe({ name: 'countryName' })
export class CountryNamePipe implements PipeTransform {
  transform(countryCode: string | undefined): string {
    return countryCode ? (getName(countryCode, 'en') ?? countryCode) : 'Unresolved';
  }
}
