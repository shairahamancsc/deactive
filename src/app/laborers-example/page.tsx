// app/laborers-example/page.tsx
"use client"

import type { Laborer } from "@/lib/types"; // Assuming your Laborer type is here
import Image from "next/image";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function LaborersExamplePage() {
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/get-laborers-example');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `API request failed with status ${res.status}`);
        }
        const jsonData = await res.json();
        // The actual data is in jsonData.data.rows based on the API response structure
        setLaborers(jsonData.data?.rows || []); 
      } catch (err: any) {
        console.error("Failed to fetch laborers:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Laborers List (Tutorial Example)</CardTitle>
          <CardDescription>This page demonstrates fetching laborer data via an API route, similar to the Vercel Postgres tutorial.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="text-destructive bg-destructive/10 p-4 rounded-md">
              <p className="font-semibold">Error loading data:</p>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && (
            laborers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile No.</TableHead>
                    <TableHead>Aadhaar No.</TableHead>
                    <TableHead>PAN No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laborers.map((laborer) => (
                    <TableRow key={laborer.id}>
                      <TableCell>
                        <Image
                          src={laborer.profilePhotoUrl || `https://placehold.co/40x40.png?text=${laborer.name.charAt(0)}`}
                          alt={laborer.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                          data-ai-hint="profile person"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{laborer.name}</TableCell>
                      <TableCell>{laborer.mobileNo}</TableCell>
                      <TableCell>{laborer.aadhaarNo}</TableCell>
                      <TableCell>{laborer.panNo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No laborers found or data could not be loaded.</p>
            )
          )}
        </CardContent>
      </Card>
       <div className="mt-6 text-center text-xs text-muted-foreground">
        Data fetched from Vercel Postgres via <code>/api/get-laborers-example</code>
      </div>
    </div>
  );
}
