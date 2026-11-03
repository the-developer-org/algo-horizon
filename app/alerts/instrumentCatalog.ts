export type InstrumentTab = 'stocks' | 'options' | 'indexes';

export const INSTRUMENT_TABS: { id: InstrumentTab; label: string }[] = [
  { id: 'stocks', label: 'Stocks' },
  { id: 'options', label: 'Stock Options' },
  { id: 'indexes', label: 'Indexes' },
];

export interface IndexInstrument {
  name: string;
  key: string;
  instrumentKey: string;
  tredCodeKey?: string;
}

export const INDEXES: IndexInstrument[] = [
  { name: 'Nifty 50', key: 'NIFTY_50', instrumentKey: 'NSE_INDEX|Nifty 50', tredCodeKey: 'NIFTY' },
  { name: 'Nifty 100', key: 'NIFTY_100', instrumentKey: 'NSE_INDEX|Nifty 100' },
  { name: 'Nifty 200', key: 'NIFTY_200', instrumentKey: 'NSE_INDEX|Nifty 200' },
  { name: 'Nifty 500', key: 'NIFTY_500', instrumentKey: 'NSE_INDEX|Nifty 500' },
  { name: 'Nifty Auto', key: 'NIFTY_AUTO', instrumentKey: 'NSE_INDEX|Nifty Auto', tredCodeKey: 'NIFTYAUTO' },
  { name: 'Nifty Bank', key: 'NIFTY_BANK', instrumentKey: 'NSE_INDEX|Nifty Bank', tredCodeKey: 'BANKNIFTY' },
  { name: 'Nifty Commodities', key: 'NIFTY_COMMODITIES', instrumentKey: 'NSE_INDEX|Nifty Commodities' },
  { name: 'Nifty Consumer Durables', key: 'NIFTY_CONSUMER_DURABLES', instrumentKey: 'NSE_INDEX|Nifty Consumer Durables' },
  { name: 'Nifty CPSE', key: 'NIFTY_CPSE', instrumentKey: 'NSE_INDEX|Nifty CPSE' },
  { name: 'Nifty Financial Services', key: 'NIFTY_FINANCIAL_SERVICES', instrumentKey: 'NSE_INDEX|Nifty Financial Services', tredCodeKey: 'NIFTYFINSERVICE' },
  { name: 'Nifty FMCG', key: 'NIFTY_FMCG', instrumentKey: 'NSE_INDEX|Nifty FMCG', tredCodeKey: 'NIFTYFMCG' },
  { name: 'Nifty Healthcare', key: 'NIFTY_HEALTHCARE', instrumentKey: 'NSE_INDEX|NIFTY HEALTHCARE' },
  { name: 'Nifty IT', key: 'NIFTY_IT', instrumentKey: 'NSE_INDEX|Nifty IT', tredCodeKey: 'CNXIT' },
  { name: 'Nifty Media', key: 'NIFTY_MEDIA', instrumentKey: 'NSE_INDEX|Nifty Media', tredCodeKey: 'NIFTYMEDIA' },
  { name: 'Nifty Metal', key: 'NIFTY_METAL', instrumentKey: 'NSE_INDEX|Nifty Metal', tredCodeKey: 'NIFTYMETAL' },
  { name: 'Nifty Midcap 50', key: 'NIFTY_MIDCAP_50', instrumentKey: 'NSE_INDEX|Nifty Midcap 50' },
  { name: 'Nifty Midcap 100', key: 'NIFTY_MIDCAP_100', instrumentKey: 'NSE_INDEX|NIFTY MIDCAP 100' },
  { name: 'Nifty Midcap 150', key: 'NIFTY_MIDCAP_150', instrumentKey: 'NSE_INDEX|NIFTY MIDCAP 150' },
  { name: 'Nifty Midcap Select', key: 'NIFTY_MIDCAP_SELECT', instrumentKey: 'NSE_INDEX|NIFTY MID SELECT' },
  { name: 'Nifty Next 50', key: 'NIFTY_NEXT_50', instrumentKey: 'NSE_INDEX|Nifty Next 50' },
  { name: 'Nifty Oil & Gas', key: 'NIFTY_OIL_AND_GAS', instrumentKey: 'NSE_INDEX|NIFTY OIL AND GAS' },
  { name: 'Nifty Pharma', key: 'NIFTY_PHARMA', instrumentKey: 'NSE_INDEX|Nifty Pharma', tredCodeKey: 'CNXPHARMA' },
  { name: 'Nifty Private Bank', key: 'NIFTY_PRIVATE_BANK', instrumentKey: 'NSE_INDEX|Nifty Private Bank', tredCodeKey: 'NIFTYPVTBANK' },
  { name: 'Nifty PSU Bank', key: 'NIFTY_PSU_BANK', instrumentKey: 'NSE_INDEX|Nifty PSU Bank', tredCodeKey: 'NIFTYPSUBANK' },
  { name: 'Nifty Realty', key: 'NIFTY_REALTY', instrumentKey: 'NSE_INDEX|Nifty Realty', tredCodeKey: 'CNXREALTY' },
  { name: 'Nifty Smallcap 50', key: 'NIFTY_SMALLCAP_50', instrumentKey: 'NSE_INDEX|Nifty Smallcap 500' },
  { name: 'Nifty Smallcap 100', key: 'NIFTY_SMALLCAP_100', instrumentKey: 'NSE_INDEX|Nifty Smallcap 100' },
  { name: 'Nifty Smallcap 250', key: 'NIFTY_SMALLCAP_250', instrumentKey: 'NSE_INDEX|Nifty Smallcap 250' },
  { name: 'Nifty Smallcap 500', key: 'NIFTY_SMALLCAP_500', instrumentKey: 'NSE_INDEX|Nifty Smallcap 500' },
  { name: 'Nifty Capital Goods', key: 'NIFTY_CAPITAL_GOODS', instrumentKey: 'NSE_INDEX|Nifty Capital Mkt' },
  { name: 'Nifty Cement', key: 'NIFTY_CEMENT', instrumentKey: 'NSE_INDEX|Nifty Cement' },
  { name: 'Nifty Chemicals', key: 'NIFTY_CHEMICALS', instrumentKey: 'NSE_INDEX|Nifty Chemicals' },
  { name: 'Nifty Construction', key: 'NIFTY_CONSTRUCTION', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty Consumer Services', key: 'NIFTY_CONSUMER_SERVICES', instrumentKey: 'NSE_INDEX|Nifty Consumer Services' },
  { name: 'Nifty Energy', key: 'NIFTY_ENERGY', instrumentKey: 'NSE_INDEX|Nifty Energy', tredCodeKey: 'CNXENERGY' },
  { name: 'Nifty Financial Services 25-50', key: 'NIFTY_FINANCIAL_SERVICES_25_50', instrumentKey: 'NSE_INDEX|Nifty Financial Services 25 50' },
  { name: 'Nifty Financial Services Ex-Bank', key: 'NIFTY_FINANCIAL_SERVICES_EX_BANK', instrumentKey: 'NSE_INDEX|Nifty Financial Services Ex Bank' },
  { name: 'Nifty Hospitals', key: 'NIFTY_HOSPITALS', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty India Consumption', key: 'NIFTY_INDIA_CONSUMPTION', instrumentKey: 'NSE_INDEX|Nifty India Consumption' },
  { name: 'Nifty India Defence', key: 'NIFTY_INDIA_DEFENCE', instrumentKey: 'NSE_INDEX|Nifty India Defence' },
  { name: 'Nifty India Digital', key: 'NIFTY_INDIA_DIGITAL', instrumentKey: 'NSE_INDEX|Nifty India Digital' },
  { name: 'Nifty India Manufacturing', key: 'NIFTY_INDIA_MANUFACTURING', instrumentKey: 'NSE_INDEX|Nifty India Manufacturing' },
  { name: 'Nifty Infrastructure', key: 'NIFTY_INFRASTRUCTURE', instrumentKey: 'NSE_INDEX|Nifty Infrastructure' },
  { name: 'Nifty Insurance', key: 'NIFTY_INSURANCE', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty LargeMidcap 250', key: 'NIFTY_LARGEMIDCAP_250', instrumentKey: 'NSE_INDEX|Nifty Largemidcap 250' },
  { name: 'Nifty Microcap 250', key: 'NIFTY_MICROCAP_250', instrumentKey: 'NSE_INDEX|Nifty Microcap 250' },
  { name: 'Nifty Midsmallcap 400', key: 'NIFTY_MIDSMALLCAP_400', instrumentKey: 'NSE_INDEX|Nifty Midsmallcap 400' },
  { name: 'Nifty MNC', key: 'NIFTY_MNC', instrumentKey: 'NSE_INDEX|Nifty MNC' },
  { name: 'Nifty Mobility', key: 'NIFTY_MOBILITY', instrumentKey: 'NSE_INDEX|Nifty Mobility' },
  { name: 'Nifty NBFC', key: 'NIFTY_NBFC', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty Power', key: 'NIFTY_POWER', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty PSE', key: 'NIFTY_PSE', instrumentKey: 'NSE_INDEX|Nifty PSE' },
  { name: 'Nifty Telecommunications', key: 'NIFTY_TELECOMMUNICATIONS', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty Total Market', key: 'NIFTY_TOTAL_MARKET', instrumentKey: 'NSE_INDEX|Nifty Total Market' },
  { name: 'Nifty Transportation & Logistics', key: 'NIFTY_TRANSPORTATION_LOGISTICS', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty 500 Healthcare', key: 'NIFTY500_HEALTHCARE', instrumentKey: 'NSE_INDEX|Nifty500 Health' },
  { name: 'Nifty Capital Markets', key: 'NIFTY_CAPITAL_MARKETS', instrumentKey: 'NSE_INDEX|Nifty Capital Markets' },
  { name: 'Nifty Commercial Transport Services', key: 'NIFTY_COMMERCIAL_TRANSPORT_SERVICES', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty Core Housing', key: 'NIFTY_CORE_HOUSING', instrumentKey: 'NSE_INDEX|Nifty CoreHousing' },
  { name: 'Nifty EV & New Age Automotive', key: 'NIFTY_EV_NEW_AGE_AUTOMOTIVE', instrumentKey: 'NSE_INDEX|Nifty Ev New Age Automotive' },
  { name: 'Nifty Housing Finance', key: 'NIFTY_HOUSING_FINANCE', instrumentKey: 'NSE_INDEX|Nifty Housing' },
  { name: 'Nifty India Internet', key: 'NIFTY_INDIA_INTERNET', instrumentKey: 'NSE_INDEX|Nifty India Internet' },
  { name: 'Nifty India Railways PSU', key: 'NIFTY_INDIA_RAILWAYS_PSU', instrumentKey: 'NSE_INDEX|Nifty India Railways Psu' },
  { name: 'Nifty India Tourism', key: 'NIFTY_INDIA_TOURISM', instrumentKey: 'NSE_INDEX|Nifty India Tourism' },
  { name: 'Nifty Midsmall Financial Services', key: 'NIFTY_MIDSMALL_FINANCIAL_SERVICES', instrumentKey: 'NSE_INDEX|Nifty Midsmall Financial Services' },
  { name: 'Nifty Midsmall Healthcare', key: 'NIFTY_MIDSMALL_HEALTHCARE', instrumentKey: 'NSE_INDEX|Nifty Midsmall Healthcare' },
  { name: 'Nifty Midsmall IT Telecom', key: 'NIFTY_MIDSMALL_IT_TELECOM', instrumentKey: 'NSE_INDEX|Nifty Midsmall It Telecom' },
  { name: 'Nifty REITs & InvITs', key: 'NIFTY_REITS_INVITS', instrumentKey: 'NSE_INDEX|Nifty REITs Realty' },
  { name: 'Nifty REITs Realty', key: 'NIFTY_REITS_REALTY', instrumentKey: 'NSE_INDEX|Nifty REITs Realty' },
  { name: 'Nifty Retail', key: 'NIFTY_RETAIL', instrumentKey: 'NSE_INDEX|Nifty 50' },
  { name: 'Nifty Services Sector', key: 'NIFTY_SERVICES_SECTOR', instrumentKey: 'NSE_INDEX|Nifty Services Sector' },
  { name: 'Nifty Small Finance Banks & Microfinance', key: 'NIFTY_SMALL_FINANCE_BANKS_MICROFINANCE', instrumentKey: 'NSE_INDEX|Nifty Smallcap 500' },
  { name: 'Nifty SME Emerge', key: 'NIFTY_SME_EMERGE', instrumentKey: 'NSE_INDEX|Nifty SME Emerge' },
  { name: 'Nifty Sugar & Ethanol', key: 'NIFTY_SUGAR_ETHANOL', instrumentKey: 'NSE_INDEX|Nifty 50' },
];

function sectorSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[\s_-]+/g, '');
}

/** Trendlyne sector Symbol (tredCodeKey) -> INDEXES.key. Only explicit keys match. */
export const TRED_CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  INDEXES.flatMap((item) => item.tredCodeKey ? [[sectorSymbol(item.tredCodeKey), item.key]] : []),
);

export function indexForSector(symbol: string): IndexInstrument | undefined {
  const key = TRED_CODE_TO_KEY[sectorSymbol(symbol)];
  return key ? INDEXES.find((item) => item.key === key) : undefined;
}

// Mapping from API index name (NIFTY_XXX) to Instrument Key (NSE_INDEX|Display Name)
export const INDEX_NAME_TO_KEY: Record<string, string> = {
  'NIFTY_100': 'NSE_INDEX|Nifty 100',
  'NIFTY_200': 'NSE_INDEX|Nifty 200',
  'NIFTY_50': 'NSE_INDEX|Nifty 50',
  'NIFTY_500': 'NSE_INDEX|Nifty 500',
  'NIFTY_AUTO': 'NSE_INDEX|Nifty Auto',
  'NIFTY_BANK': 'NSE_INDEX|Nifty Bank',
  'NIFTY_COMMODITIES': 'NSE_INDEX|Nifty Commodities',
  'NIFTY_CONSUMER_DURABLES': 'NSE_INDEX|Nifty Consumer Durables',
  'NIFTY_CPSE': 'NSE_INDEX|Nifty CPSE',
  'NIFTY_FINANCIAL_SERVICES': 'NSE_INDEX|Nifty Financial Services',
  'NIFTY_FMCG': 'NSE_INDEX|Nifty FMCG',
  'NIFTY_HEALTHCARE': 'NSE_INDEX|NIFTY HEALTHCARE',
  'NIFTY_IT': 'NSE_INDEX|Nifty IT',
  'NIFTY_MEDIA': 'NSE_INDEX|Nifty Media',
  'NIFTY_METAL': 'NSE_INDEX|Nifty Metal',
  'NIFTY_MIDCAP_150': 'NSE_INDEX|NIFTY MIDCAP 150',
  'NIFTY_MIDCAP_50': 'NSE_INDEX|Nifty Midcap 50',
  'NIFTY_NEXT_50': 'NSE_INDEX|Nifty Next 50',
  'NIFTY_OIL_AND_GAS': 'NSE_INDEX|NIFTY OIL AND GAS',
  'NIFTY_PHARMA': 'NSE_INDEX|Nifty Pharma',
  'NIFTY_PRIVATE_BANK': 'NSE_INDEX|Nifty Private Bank',
  'NIFTY_PSU_BANK': 'NSE_INDEX|Nifty PSU Bank',
  'NIFTY_REALTY': 'NSE_INDEX|Nifty Realty',
  'NIFTY_SMALLCAP_250': 'NSE_INDEX|Nifty Smallcap 250',
  'NIFTY_SMALLCAP_50': 'NSE_INDEX|Nifty Smallcap 500',
  'NIFTY_CAPITAL_GOODS': 'NSE_INDEX|Nifty Capital Mkt',
  'NIFTY_CEMENT': 'NSE_INDEX|Nifty Cement',
  'NIFTY_CHEMICALS': 'NSE_INDEX|Nifty Chemicals',
  'NIFTY_CONSTRUCTION': 'NSE_INDEX|Nifty 50',
  'NIFTY_CONSUMER_SERVICES': 'NSE_INDEX|Nifty Consumer Services',
  'NIFTY_ENERGY': 'NSE_INDEX|Nifty Energy',
  'NIFTY_FINANCIAL_SERVICES_25_50': 'NSE_INDEX|Nifty Financial Services 25 50',
  'NIFTY_FINANCIAL_SERVICES_EX_BANK': 'NSE_INDEX|Nifty Financial Services Ex Bank',
  'NIFTY_HOSPITALS': 'NSE_INDEX|Nifty 50',
  'NIFTY_INDIA_CONSUMPTION': 'NSE_INDEX|Nifty India Consumption',
  'NIFTY_INDIA_DEFENCE': 'NSE_INDEX|Nifty India Defence',
  'NIFTY_INDIA_DIGITAL': 'NSE_INDEX|Nifty India Digital',
  'NIFTY_INDIA_MANUFACTURING': 'NSE_INDEX|Nifty India Manufacturing',
  'NIFTY_INFRASTRUCTURE': 'NSE_INDEX|Nifty Infrastructure',
  'NIFTY_INSURANCE': 'NSE_INDEX|Nifty 50',
  'NIFTY_LARGEMIDCAP_250': 'NSE_INDEX|Nifty Largemidcap 250',
  'NIFTY_MICROCAP_250': 'NSE_INDEX|Nifty Microcap 250',
  'NIFTY_MIDCAP_100': 'NSE_INDEX|NIFTY MIDCAP 100',
  'NIFTY_MIDCAP_SELECT': 'NSE_INDEX|NIFTY MID SELECT',
  'NIFTY_MIDSMALLCAP_400': 'NSE_INDEX|Nifty Midsmallcap 400',
  'NIFTY_MNC': 'NSE_INDEX|Nifty MNC',
  'NIFTY_MOBILITY': 'NSE_INDEX|Nifty Mobility',
  'NIFTY_NBFC': 'NSE_INDEX|Nifty 50',
  'NIFTY_POWER': 'NSE_INDEX|Nifty 50',
  'NIFTY_PSE': 'NSE_INDEX|Nifty PSE',
  'NIFTY_SMALLCAP_100': 'NSE_INDEX|Nifty Smallcap 100',
  'NIFTY_SMALLCAP_500': 'NSE_INDEX|Nifty Smallcap 500',
  'NIFTY_TELECOMMUNICATIONS': 'NSE_INDEX|Nifty 50',
  'NIFTY_TOTAL_MARKET': 'NSE_INDEX|Nifty Total Market',
  'NIFTY_TRANSPORTATION_LOGISTICS': 'NSE_INDEX|Nifty 50',
  'NIFTY500_HEALTHCARE': 'NSE_INDEX|Nifty500 Health',
  'NIFTY_CAPITAL_MARKETS': 'NSE_INDEX|Nifty Capital Markets',
  'NIFTY_COMMERCIAL_TRANSPORT_SERVICES': 'NSE_INDEX|Nifty 50',
  'NIFTY_CORE_HOUSING': 'NSE_INDEX|Nifty CoreHousing',
  'NIFTY_EV_NEW_AGE_AUTOMOTIVE': 'NSE_INDEX|Nifty Ev New Age Automotive',
  'NIFTY_HOUSING_FINANCE': 'NSE_INDEX|Nifty Housing',
  'NIFTY_INDIA_INTERNET': 'NSE_INDEX|Nifty India Internet',
  'NIFTY_INDIA_RAILWAYS_PSU': 'NSE_INDEX|Nifty India Railways Psu',
  'NIFTY_INDIA_TOURISM': 'NSE_INDEX|Nifty India Tourism',
  'NIFTY_MIDSMALL_FINANCIAL_SERVICES': 'NSE_INDEX|Nifty Midsmall Financial Services',
  'NIFTY_MIDSMALL_HEALTHCARE': 'NSE_INDEX|Nifty Midsmall Healthcare',
  'NIFTY_MIDSMALL_IT_TELECOM': 'NSE_INDEX|Nifty Midsmall It Telecom',
  'NIFTY_REITS_INVITS': 'NSE_INDEX|Nifty REITs Realty',
  'NIFTY_REITS_REALTY': 'NSE_INDEX|Nifty REITs Realty',
  'NIFTY_RETAIL': 'NSE_INDEX|Nifty 50',
  'NIFTY_SERVICES_SECTOR': 'NSE_INDEX|Nifty Services Sector',
  'NIFTY_SMALL_FINANCE_BANKS_MICROFINANCE': 'NSE_INDEX|Nifty Smallcap 500',
  'NIFTY_SME_EMERGE': 'NSE_INDEX|Nifty SME Emerge',
  'NIFTY_SUGAR_ETHANOL': 'NSE_INDEX|Nifty 50',
};

export interface OptionContract {
  trading_symbol: string;
  instrument_key: string;
  strike_price?: number;
  instrument_type?: string;
  expiry?: string;
}

export function sessionClose(date: string) {
  return `${date.slice(0, 10)}T15:30:00`;
}

export function todaySessionClose() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return sessionClose(today);
}

export function nextExpiryContracts(contracts: OptionContract[]): OptionContract[] {
  const chain = contracts.filter((item) => item.instrument_type === 'CE' || item.instrument_type === 'PE');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const nextExpiry = [...new Set(chain.map((item) => item.expiry).filter((expiry): expiry is string => Boolean(expiry)))]
    .filter((expiry) => expiry >= today)
    .sort()[0];
  const selected = nextExpiry ? chain.filter((item) => item.expiry === nextExpiry) : chain;
  return selected.sort(
    (a, b) => (a.strike_price ?? 0) - (b.strike_price ?? 0) || (a.instrument_type === 'CE' ? 0 : 1) - (b.instrument_type === 'CE' ? 0 : 1),
  );
}

export async function fetchOptionContracts(instrumentKey: string): Promise<OptionContract[]> {
  const url = `/api/upstox/option-contracts?instrument_key=${encodeURIComponent(instrumentKey)}`;
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.statusText || body?.message || 'Could not load option contracts');
  }
  return Array.isArray(body?.data) ? body.data : [];
}
