
"use server";

import { subDays, format } from "date-fns";
import { z } from "zod";
import { analyzeWorkDescriptions as analyzeWorkDescriptionsFlow } from "@/ai/flows/analyze-work-descriptions";
import { summarizeDailyActivity as summarizeDailyActivityFlow, type SummarizeDailyActivityInput } from "@/ai/flows/summarize-daily-activity-flow";
import type { DailyEntryForSummary } from "@/ai/flows/summarize-daily-activity-flow";
import type { Laborer, DailyEntry } from "./types";
import { revalidatePath } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { put } from "@vercel/blob";
import { Buffer } from 'buffer';

// Helper to convert data URI to Buffer
function dataUriToBuffer(dataUri: string): { buffer: Buffer; contentType: string | undefined, extension: string | undefined } {
  const [header, base64Data] = dataUri.split(',');
  if (!header || !base64Data) {
    throw new Error('Invalid data URI');
  }
  const contentTypeMatch = header.match(/:(.*?);/);
  const contentType = contentTypeMatch ? contentTypeMatch[1] : undefined;
  const extension = contentType ? contentType.split('/')[1] : undefined;
  const buffer = Buffer.from(base64Data, 'base64');
  return { buffer, contentType, extension };
}

function checkSupabaseEnvVars() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("FATAL: SUPABASE_URL environment variable is not set for admin client.");
    throw new Error("Database configuration error: SUPABASE_URL is missing. Please set it in your environment variables.");
  }
  if (!supabaseServiceKey) {
    console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY environment variable is not set for admin client.");
    throw new Error("Database configuration error: SUPABASE_SERVICE_ROLE_KEY is missing. Please set it in your environment variables.");
  }
}


function getSupabaseAdminClient(): SupabaseClient {
  checkSupabaseEnvVars(); // Ensures variables are checked before client creation
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

const BLOB_HOSTNAME = process.env.BLOB_HOSTNAME || 'blob.vercel-storage.com';

function checkBlobToken() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn("BLOB_READ_WRITE_TOKEN environment variable is not set. File uploads to Vercel Blob will fail or be skipped.");
    }
}


// This function primarily serves to remind the developer of the DDL.
// Actual table creation and RLS should be managed via Supabase dashboard or migrations.
// It's not typically called at runtime in production server actions.
function ensureTablesExistDDLGuidance() {
  console.log("INFO: DDL guidance for Supabase. Manage schema in Supabase dashboard or via migrations.");
  console.log(
`
    -- Laborers Table
    CREATE TABLE IF NOT EXISTS laborers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobileno TEXT NOT NULL,
      aandhaarno TEXT NOT NULL,
      panno TEXT NOT NULL,
      profilephotourl TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Daily Entries Table
    CREATE TABLE IF NOT EXISTS daily_entries (
      id TEXT PRIMARY KEY,
      laborerid TEXT NOT NULL REFERENCES laborers(id) ON DELETE CASCADE,
      date TEXT NOT NULL, -- Store as "yyyy-MM-dd"
      ispresent BOOLEAN NOT NULL,
      advancepaid INTEGER NOT NULL DEFAULT 0,
      workdetails TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for Daily Entries
    CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);
    CREATE INDEX IF NOT EXISTS idx_daily_entries_laborerid ON daily_entries(laborerid);

    -- Notes Table (for example page at /notes)
    CREATE TABLE IF NOT EXISTS notes (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  );
}

// --- Add Laborer ---
const AddLaborerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobileNo: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  aadhaarNo: z.string().regex(/^\d{12}$/, "Aadhaar number must be 12 digits"),
  panNo: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number format"),
  profilePhotoUrl: z.string().optional().or(z.literal('')),
});

export type AddLaborerState = {
  message?: string;
  errors?: {
    name?: string[];
    mobileNo?: string[];
    aadhaarNo?: string[];
    panNo?: string[];
    profilePhotoUrl?: string[];
    form?: string;
  };
  success?: boolean;
};

export async function addLaborerAction(
  prevState: AddLaborerState,
  formData: FormData
): Promise<AddLaborerState> {
  checkBlobToken();
  const supabase = getSupabaseAdminClient();

  const validatedFields = AddLaborerSchema.safeParse({
    name: formData.get("name"),
    mobileNo: formData.get("mobileNo"),
    aadhaarNo: formData.get("aadhaarNo"),
    panNo: formData.get("panNo"),
    profilePhotoUrl: formData.get("profilePhotoUrl"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields.",
      success: false,
    };
  }

  const { name, mobileNo, aadhaarNo, panNo, profilePhotoUrl: photoDataUri } = validatedFields.data;
  const laborerId = crypto.randomUUID();
  let finalProfilePhotoUrl: string | null = null;

  try {
    if (photoDataUri && photoDataUri.startsWith('data:image')) {
      const { buffer, contentType, extension } = dataUriToBuffer(photoDataUri);
      const photoName = 'laborer_photos/' + laborerId + '.' + (extension || 'png');

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn("BLOB_READ_WRITE_TOKEN not set. Skipping photo upload to blob storage. Using placeholder.");
        finalProfilePhotoUrl = 'https://placehold.co/80x80.png?text=' + name.charAt(0);
      } else {
        const blob = await put(photoName, buffer, {
          access: 'public',
          contentType: contentType,
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
        });
        finalProfilePhotoUrl = blob.url;
      }
    } else {
        finalProfilePhotoUrl = 'https://placehold.co/80x80.png?text=' + name.charAt(0);
    }

    const { error } = await supabase
      .from('laborers')
      .insert([{ 
        id: laborerId, 
        name, 
        mobileno: mobileNo, 
        aandhaarno: aadhaarNo, 
        panno: panNo, 
        profilephotourl: finalProfilePhotoUrl 
      }]);

    if (error) {
      console.error("Supabase error adding laborer:", error);
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/daily-entry");
    revalidatePath("/laborers/add");
    return { message: "Laborer added successfully!", success: true };

  } catch (error: any) {
    console.error("Error adding laborer:", error);
    return {
        message: 'Failed to add laborer: ' + (error.message || 'Database or Blob storage error.'),
        success: false,
        errors: { form: error.message || 'An unexpected error occurred.'}
    };
  }
}

// --- Delete Laborer ---
const DeleteLaborerSchema = z.object({
  laborerId: z.string().min(1, "Laborer ID is required"),
});

export type DeleteLaborerState = {
  message?: string;
  errors?: {
    laborerId?: string[];
    form?: string;
  };
  success?: boolean;
};

export async function deleteLaborerAction(
  prevState: DeleteLaborerState,
  formData: FormData
): Promise<DeleteLaborerState> {
  const supabase = getSupabaseAdminClient();
  const validatedFields = DeleteLaborerSchema.safeParse({
    laborerId: formData.get("laborerId"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Laborer ID missing.",
      success: false,
    };
  }
  const { laborerId } = validatedFields.data;

  try {

    const { error, count } = await supabase
      .from('laborers')
      .delete()
      .eq('id', laborerId);

    if (error) {
      console.error("Supabase error deleting laborer:", error);
      throw new Error(error.message);
    }

    if (count === 0) {
        return { message: "Laborer not found or already deleted.", success: false };
    }

    revalidatePath("/dashboard");
    revalidatePath("/daily-entry");
    return { message: "Laborer and associated entries deleted successfully!", success: true };
  } catch (error: any) {
    console.error("Error deleting laborer:", error);
    return {
        message: 'Failed to delete laborer: ' + (error.message || 'Database error.'),
        success: false,
        errors: { form: error.message || 'An unexpected error occurred.' }
    };
  }
}


// --- Add Daily Entry (Multiple Laborers) ---
export type AddDailyEntryState = {
  message?: string;
  errors?: {
    date?: string[];
    workDetails?: string[];
    form?: string;
  };
  success?: boolean;
};

export async function addDailyEntryAction(
  prevState: AddDailyEntryState,
  formData: FormData
): Promise<AddDailyEntryState> {
  const supabase = getSupabaseAdminClient();

  const date = formData.get("date") as string;
  const workDetails = formData.get("workDetails") as string;
  const laborerCount = parseInt(formData.get("laborerCount") as string, 10);

  if (!date) {
    return { message: "Date is required.", success: false, errors: { date: ["Date is required."] } };
  }
   if (isNaN(laborerCount) || laborerCount < 0) {
    return { message: "Invalid laborer count.", success: false, errors: { form: "Invalid laborer data."}};
  }

  let presentLaborerExists = false;
  const entriesToInsert = [];

  for (let i = 0; i < laborerCount; i++) {
    const laborerIdValue = formData.get('laborerId_' + i) as string;
    if (laborerIdValue) {
        let isPresentStr = formData.get('isPresent_' + laborerIdValue) as "present" | "absent";
        if (!isPresentStr) {
          console.warn('Missing presence data for laborer ID ' + laborerIdValue + ', defaulting to absent.');
          isPresentStr = "absent";
        }
        const isPresentValue = isPresentStr === "present";
        if (isPresentValue) {
            presentLaborerExists = true;
        }

        const advancePaidStr = formData.get('advancePaid_' + laborerIdValue) as string;
        let advancePaidValue = parseInt(advancePaidStr, 10);
        if (isNaN(advancePaidValue) || advancePaidValue < 0) {
          console.warn('Invalid advance paid for laborer ID ' + laborerIdValue + ', defaulting to 0.');
          advancePaidValue = 0;
        }

        const entryId = crypto.randomUUID();
        let entryWorkDetails = isPresentValue ? workDetails : "Absent";

        entriesToInsert.push({
            id: entryId,
            laborerid: laborerIdValue, 
            date,
            ispresent: isPresentValue, 
            advancepaid: advancePaidValue, 
            workdetails: entryWorkDetails, 
        });
    }
  }

  if (!workDetails && presentLaborerExists) {
     return { message: "Work details are required if any laborer is marked present.", success: false, errors: { workDetails: ["Work details are required if laborers are present."] } };
  }

  try {
    if (entriesToInsert.length > 0) {
        const { error } = await supabase.from('daily_entries').insert(entriesToInsert);
        if (error) {
            console.error("Supabase error adding daily entries:", error);
            throw new Error(error.message);
        }
    }

    revalidatePath("/dashboard");
    revalidatePath("/daily-entry");
    return { message: "Daily entries recorded successfully!", success: true };

  } catch (error: any) {
    console.error("Error adding daily entries:", error);
    return {
      message: 'Failed to record daily entries: ' + (error.message || 'Database error.'),
      success: false,
      errors: { form: error.message || 'An unexpected error occurred while saving entries.' }
    };
  }
}


// --- Work Analysis ---
const AnalyzeWorkSchema = z.object({
  workDescriptions: z.string().min(10, "Work descriptions must be at least 10 characters"),
});

export type AnalyzeWorkState = {
  message?: string;
  errors?: {
    workDescriptions?: string[];
  };
  analysisResult?: string;
  success?: boolean;
};

export async function analyzeWorkAction(
  prevState: AnalyzeWorkState,
  formData: FormData
): Promise<AnalyzeWorkState> {
  const validatedFields = AnalyzeWorkSchema.safeParse({
    workDescriptions: formData.get("workDescriptions"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
      success: false,
    };
  }

  try {
    const result = await analyzeWorkDescriptionsFlow({
      workDescriptions: validatedFields.data.workDescriptions,
    });
    return {
      message: "Analysis complete.",
      analysisResult: result.materialEstimates,
      success: true,
    };
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI analysis.";
    return {
      message: "AI analysis failed: " + errorMessage,
      success: false,
    };
  }
}


// --- Daily Activity Summary (AI) ---
export type GenerateSummaryState = {
  summary?: string;
  error?: string;
  success?: boolean;
};

export async function generateSummaryAction(
  input: SummarizeDailyActivityInput
): Promise<GenerateSummaryState> {
  try {
    const result = await summarizeDailyActivityFlow(input);
    if (!result || !result.summary) {
        return { error: "AI model did not return a summary.", success: false };
    }
    return { summary: result.summary, success: true };
  } catch (error: any) {
    console.error("AI Summary Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate AI summary.";
    return { error: errorMessage, success: false };
  }
}

type SupabaseErrorLike = {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
};


// --- Data Fetching ---
export async function getLaborers(): Promise<Laborer[]> {
  const supabase = getSupabaseAdminClient();
  try {
    const { data, error } = await supabase
      .from('laborers')
      .select('id, name, mobileno, aadhaarno, panno, profilephotourl') 
      .order('name', { ascending: true });

    if (error) {
        console.error("--- SUPABASE FETCH ERROR in getLaborers ---");
        let detailMessage = "Details unknown. CHECK VERCEL SERVER LOGS for full Supabase error.";
        const supabaseError = error as SupabaseErrorLike;
        if (supabaseError.message) {
            console.error("Message:", supabaseError.message);
            detailMessage = supabaseError.message;
        }
        if (supabaseError.code) console.error("Code:", supabaseError.code);
        if (supabaseError.details) console.error("Details:", supabaseError.details);
        if (supabaseError.hint) console.error("Hint:", supabaseError.hint);
        try {
            console.error("Full Supabase error object (getLaborers):", JSON.stringify(supabaseError, null, 2));
        } catch (e) { console.error("Could not stringify Supabase error object in getLaborers."); }
        
        throw new Error("Failed to fetch laborers: " + detailMessage);
    }
    return data as Laborer[];
  } catch (error: any) {
    const finalErrorMessage = error instanceof Error ? error.message : "An unknown error occurred in getLaborers";
    console.error("Error in getLaborers processing or Supabase call:", finalErrorMessage);
    throw new Error("Failed to fetch laborers: " + finalErrorMessage + ". Check server logs for details.");
  }
}

export async function getLaborerById(id: string): Promise<Laborer | undefined> {
  const supabase = getSupabaseAdminClient();
   try {
    const { data, error } = await supabase
      .from('laborers')
      .select('id, name, mobileno, aadhaarno, panno, profilephotourl') 
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { 
        console.error("--- SUPABASE FETCH ERROR in getLaborerById (id: " + id + ") ---");
        let detailMessage = "Details unknown. CHECK VERCEL SERVER LOGS for full Supabase error.";
        const supabaseError = error as SupabaseErrorLike;
         if (supabaseError.message) {
            console.error("Message:", supabaseError.message);
            detailMessage = supabaseError.message;
        }
        if (supabaseError.code) console.error("Code:", supabaseError.code);
        if (supabaseError.details) console.error("Details:", supabaseError.details);
        if (supabaseError.hint) console.error("Hint:", supabaseError.hint);
        try {
            console.error("Full Supabase error object (getLaborerById):", JSON.stringify(supabaseError, null, 2));
        } catch (e) { console.error("Could not stringify Supabase error object in getLaborerById."); }
        throw new Error("Failed to fetch laborer by ID " + id + ": " + detailMessage);
    }
    return data as Laborer | undefined;
  } catch (error: any) {
    const finalErrorMessage = error instanceof Error ? error.message : "An unknown error occurred in getLaborerById";
    console.error('Error in getLaborerById processing or Supabase call (id: ' + id + '):', finalErrorMessage);
    throw new Error("Failed to fetch laborer by ID " + id + ": " + finalErrorMessage + ". Check server logs for details.");
  }
}

export async function getDailyEntries(): Promise<DailyEntry[]> {
    const supabase = getSupabaseAdminClient();
    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    try {
        const { data, error } = await supabase
            .from('daily_entries')
            .select(
              "id, laborerid, date, ispresent, advancepaid, workdetails, laborers(name)" 
            )
            .gte('date', sevenDaysAgo) 
            .order('date', { ascending: false });
        
        if (error) {
            console.error("--- SUPABASE FETCH ERROR in getDailyEntries ---");
            let detailMessage = "Details unknown. CHECK VERCEL SERVER LOGS for the full Supabase error object, message, code, details, and hint.";
            const supabaseError = error as SupabaseErrorLike;
            
            if (supabaseError.message && typeof supabaseError.message === 'string') {
                console.error("Message:", supabaseError.message);
                detailMessage = supabaseError.message;
            } else {
                console.error("Message: Not available or not a string");
            }

            console.error("Code:", supabaseError.code || "Not available");
            console.error("Details:", supabaseError.details || "Not available");
            console.error("Hint:", supabaseError.hint || "Not available");
            
            try {
                console.error("Full Supabase error object (getDailyEntries):", JSON.stringify(supabaseError, null, 2));
            } catch (stringifyError) {
                console.error("Could not stringify the Supabase error object (getDailyEntries):", stringifyError);
            }

            if (detailMessage === "Details unknown. CHECK VERCEL SERVER LOGS for the full Supabase error object, message, code, details, and hint." && !(supabaseError.message && typeof supabaseError.message === 'string')) {
                detailMessage = "Check server logs for full Supabase error object; 'message' property was not available or not a string.";
            }
            throw new Error("Failed to fetch daily entries: " + detailMessage);
        }

        if (!data) {
            console.warn("No data returned from daily_entries fetch, but no explicit error. Returning empty array.");
            return [];
        }
        
        const processedEntries = data.map(row => {
          let laborerName = "Unknown Laborer";
          if (row.laborers) { 
            const laborerData = row.laborers as { name: string } | { name: string }[] | null; 
            if (Array.isArray(laborerData)) {
              if (laborerData.length > 0 && laborerData[0] && typeof laborerData[0].name === 'string') {
                laborerName = laborerData[0].name;
              }
            } else if (laborerData && typeof laborerData.name === 'string') {
              laborerName = laborerData.name;
            }
          }
          
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { laborers, ...restOfRow } = row; 
          return {
            ...restOfRow,
            laborerName, 
          };
        }) as DailyEntry[];

        return processedEntries;
    } catch (error: any) { 
        const finalErrorMessage = error instanceof Error ? error.message : "An unknown error occurred in getDailyEntries";
        console.error("Error in getDailyEntries processing or Supabase call:", finalErrorMessage);
        if (typeof error === 'object' && error !== null) {
            try {
                const fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
                console.error("Full error object in outer catch (getDailyEntries):", fullError);
            } catch (e) { /* ignore stringify error if it's not serializable */ }
        }
        throw new Error("Failed to fetch daily entries: " + finalErrorMessage + ". Check server logs for details.");
    }
}
