
import { getLaborers, getDailyEntries } from "@/lib/actions";
import type { DailyEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusCircle, Users, UserCheck, IndianRupee, ListChecks, CalendarDays, UsersRound } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  className?: string;
}

function SummaryCard({ title, value, icon: Icon, description, className }: SummaryCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

interface GroupedDailyEntry {
  date: string; // Formatted date for display
  originalDate: string; // yyyy-MM-dd for sorting/keying
  presentLaborersCount: number;
  entries: Array<DailyEntry & { laborerName: string }>;
}

export default async function DashboardPage() {
  const [laborers, rawDailyEntries] = await Promise.all([
    getLaborers(),
    getDailyEntries(),
  ]);

  const today = format(new Date(), "yyyy-MM-dd");

  const totalLaborers = laborers.length;
  const laborersPresentToday = rawDailyEntries.filter(
    (entry) => entry.date === today && entry.isPresent
  ).length;
  const totalAdvancePaid = rawDailyEntries.reduce(
    (sum, entry) => sum + entry.advancePaid,
    0
  );
  const totalDailyEntries = rawDailyEntries.length;

  const laborerNameMap = new Map(laborers.map(l => [l.id, l.name]));

  const processedDailyEntries = rawDailyEntries.map(entry => ({
    ...entry,
    laborerName: laborerNameMap.get(entry.laborerId) || "Unknown Laborer",
  }));

  const entriesByDate = processedDailyEntries.reduce((acc, entry) => {
    const dateKey = entry.date; // yyyy-MM-dd
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, Array<DailyEntry & { laborerName: string }>>);

  const groupedDailyEntries: GroupedDailyEntry[] = Object.entries(entriesByDate)
    .map(([dateKey, entries]) => ({
      originalDate: dateKey,
      date: format(parseISO(dateKey), "MMMM dd, yyyy"), // Format for display
      presentLaborersCount: entries.filter(e => e.isPresent).length,
      entries: entries.sort((a,b) => a.laborerName.localeCompare(b.laborerName)), // Sort entries within a day if needed
    }))
    .sort((a, b) => new Date(b.originalDate).getTime() - new Date(a.originalDate).getTime()) // Sort dates, most recent first
    .slice(0, 7); // Show last 7 days with entries

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">
          Dashboard
        </h1>
        <Link href="/laborers/add" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Laborer
          </Button>
        </Link>
      </div>

      {/* Summary Cards Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Laborers"
          value={totalLaborers}
          icon={Users}
          description="Registered in the system"
        />
        <SummaryCard
          title="Present Today"
          value={laborersPresentToday}
          icon={UserCheck}
          description={`On ${format(new Date(), "MMM dd")}`}
        />
        <SummaryCard
          title="Total Advance Paid"
          value={`₹${totalAdvancePaid.toLocaleString()}`}
          icon={IndianRupee}
          description="Across all entries"
        />
        <SummaryCard
          title="Total Daily Entries"
          value={totalDailyEntries}
          icon={ListChecks}
          description="Logged to date"
        />
      </div>

      {/* Daily Activity Log Section */}
      {groupedDailyEntries.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary"/>
                <CardTitle className="text-xl font-headline">Daily Activity Log</CardTitle>
            </div>
            <CardDescription>Summary of labor activity for recent dates. Click to expand.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {groupedDailyEntries.map((group) => (
                <AccordionItem value={group.originalDate} key={group.originalDate}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex justify-between items-center w-full pr-2">
                        <span className="font-medium text-base">{group.date}</span>
                        <Badge variant="secondary" className="flex items-center gap-1.5">
                            <UsersRound className="h-4 w-4"/>
                            {group.presentLaborersCount} Present
                        </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {group.entries.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Laborer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Work Details</TableHead>
                            <TableHead className="text-right">Advance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.laborerName}</TableCell>
                              <TableCell>
                                <Badge variant={entry.isPresent ? "default" : "destructive"} className="capitalize">
                                  {entry.isPresent ? "Present" : "Absent"}
                                </Badge>
                              </TableCell>
                              <TableCell className="truncate max-w-xs">{entry.workDetails}</TableCell>
                              <TableCell className="text-right">₹{entry.advancePaid.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                        <p className="text-muted-foreground p-4 text-center">No entries for this date.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
       {totalLaborers === 0 && groupedDailyEntries.length === 0 && (
         <Card className="text-center py-10 shadow-md">
            <CardContent>
              <p className="text-lg text-muted-foreground">No activity yet.</p>
              <p className="text-sm text-muted-foreground">
                Start by <Link href="/laborers/add" className="text-primary hover:underline">adding a new laborer</Link> and then <Link href="/daily-entry" className="text-primary hover:underline">recording daily entries</Link>.
              </p>
            </CardContent>
          </Card>
       )}
    </div>
  );
}
