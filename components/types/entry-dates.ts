// Entry dates related types
export interface EntryDate {
  timestamp: string;
  date: Date;
}

export interface EntryDatesResponse {
  entryDates: string[];
  statusText: string;
}

export interface EntryDatesApiResponse {
  entryDates?: string[];
  statusText?: string;
  error?: string;
}
