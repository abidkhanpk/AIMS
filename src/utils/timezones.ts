export interface Timezone {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export const timezones: Timezone[] = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00', region: 'UTC' },
  
  // Africa
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT)', offset: '+00:00', region: 'Africa' },
  { value: 'Africa/Accra', label: 'Accra (GMT)', offset: '+00:00', region: 'Africa' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT)', offset: '+03:00', region: 'Africa' },
  { value: 'Africa/Algiers', label: 'Algiers (CET)', offset: '+01:00', region: 'Africa' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)', offset: '+02:00', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Casablanca (WET)', offset: '+01:00', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', offset: '+02:00', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', offset: '+01:00', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', offset: '+03:00', region: 'Africa' },
  
  // America
  { value: 'America/New_York', label: 'New York (EST/EDT)', offset: '-05:00', region: 'America' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)', offset: '-06:00', region: 'America' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)', offset: '-07:00', region: 'America' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', offset: '-08:00', region: 'America' },
  { value: 'America/Anchorage', label: 'Anchorage (AKST/AKDT)', offset: '-09:00', region: 'America' },
  { value: 'America/Honolulu', label: 'Honolulu (HST)', offset: '-10:00', region: 'America' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)', offset: '-05:00', region: 'America' },
  { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)', offset: '-08:00', region: 'America' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)', offset: '-06:00', region: 'America' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', offset: '-03:00', region: 'America' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', offset: '-03:00', region: 'America' },
  { value: 'America/Lima', label: 'Lima (PET)', offset: '-05:00', region: 'America' },
  { value: 'America/Bogota', label: 'Bogotá (COT)', offset: '-05:00', region: 'America' },
  { value: 'America/Caracas', label: 'Caracas (VET)', offset: '-04:00', region: 'America' },
  
  // Asia
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00', region: 'Asia' },
  { value: 'Asia/Karachi', label: 'Karachi (PKT)', offset: '+05:00', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST)', offset: '+05:30', region: 'Asia' },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST)', offset: '+06:00', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta (WIB)', offset: '+07:00', region: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila (PHT)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)', offset: '+03:00', region: 'Asia' },
  { value: 'Asia/Tehran', label: 'Tehran (IRST)', offset: '+03:30', region: 'Asia' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)', offset: '+02:00', region: 'Asia' },
  { value: 'Asia/Kabul', label: 'Kabul (AFT)', offset: '+04:30', region: 'Asia' },
  { value: 'Asia/Tashkent', label: 'Tashkent (UZT)', offset: '+05:00', region: 'Asia' },
  { value: 'Asia/Almaty', label: 'Almaty (ALMT)', offset: '+06:00', region: 'Asia' },
  
  // Australia & Oceania
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: '+10:00', region: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: '+10:00', region: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', offset: '+10:00', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', offset: '+08:00', region: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)', offset: '+09:30', region: 'Australia' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)', offset: '+09:30', region: 'Australia' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: '+12:00', region: 'Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji (FJT)', offset: '+12:00', region: 'Pacific' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (HST)', offset: '-10:00', region: 'Pacific' },
  
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Oslo', label: 'Oslo (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)', offset: '+02:00', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Prague', label: 'Prague (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Budapest', label: 'Budapest (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens (EET/EEST)', offset: '+02:00', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)', offset: '+03:00', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00', region: 'Europe' },
  { value: 'Europe/Kiev', label: 'Kiev (EET/EEST)', offset: '+02:00', region: 'Europe' },
  { value: 'Europe/Bucharest', label: 'Bucharest (EET/EEST)', offset: '+02:00', region: 'Europe' },
  { value: 'Europe/Sofia', label: 'Sofia (EET/EEST)', offset: '+02:00', region: 'Europe' },
  { value: 'Europe/Belgrade', label: 'Belgrade (CET/CEST)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)', offset: '+00:00', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon (WET/WEST)', offset: '+00:00', region: 'Europe' },
];

export const getTimezonesByRegion = () => {
  const regions: { [key: string]: Timezone[] } = {};
  
  timezones.forEach(tz => {
    if (!regions[tz.region]) {
      regions[tz.region] = [];
    }
    regions[tz.region].push(tz);
  });
  
  return regions;
};

export const findTimezone = (value: string): Timezone | undefined => {
  return timezones.find(tz => tz.value === value);
};
