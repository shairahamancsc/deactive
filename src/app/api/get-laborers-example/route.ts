// app/api/get-laborers-example/route.ts
import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
 
export async function GET() {
  const client = await db.connect();
  let laborers;
  
  try {
    // Ensure the table name matches your actual table name, e.g., "laborers"
    laborers = await client.sql`SELECT id, name, mobileNo, aadhaarNo, panNo, profilePhotoUrl FROM laborers ORDER BY name ASC;`;
  } catch (error: any) {
    // It's good practice to log the actual error on the server for debugging
    console.error("API Error fetching laborers:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch laborers" }, { status: 500 });
  } finally {
    // Release the client back to the pool
    client.release();
  }
 
  return NextResponse.json({ data: laborers });
}
