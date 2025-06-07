
export type Laborer = {
  id: string;
  profilePhotoUrl: string | null; 
  name: string;
  mobileNo: string;
  aadhaarNo: string;
  panNo: string;
  // totalAdvancePaid is a derived value, calculated from daily_entries.
  // It's not stored directly on the laborers table.
};

export type DailyEntry = {
  id:string; 
  laborerId: string;
  laborerName?: string; // For display purposes, populated after fetching via join
  date: string; // Expected format "yyyy-MM-dd"
  isPresent: boolean;
  advancePaid: number;
  workDetails: string;
};
