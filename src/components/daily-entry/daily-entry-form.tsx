
"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { addDailyEntryAction, type AddDailyEntryState, getLaborers } from "@/lib/actions";
import type { Laborer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ListChecks, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useFormStatus } from "react-dom";


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
      Record All Entries
    </Button>
  );
}

export function DailyEntryForm() {
  const initialState: AddDailyEntryState = { message: undefined, errors: undefined, success: false };
  const [state, dispatch] = useActionState(addDailyEntryAction, initialState);
  const { toast } = useToast();
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const formRef = useRef<HTMLFormElement>(null); 

  useEffect(() => {
    async function fetchLaborers() {
      const data = await getLaborers();
      setLaborers(data);
    }
    fetchLaborers();
  }, []);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success!",
        description: state.message,
      });
      setSelectedDate(new Date()); 
      formRef.current?.reset();
      // Manually reset radio groups to 'present' and advances to '0'
      // as formRef.current.reset() might not handle defaults for dynamically generated fields correctly in all cases.
      laborers.forEach(laborer => {
        const presentRadio = document.getElementById(`present_${laborer.id}`) as HTMLInputElement | null;
        if (presentRadio) presentRadio.checked = true;
        
        const advanceInput = document.getElementById(`advancePaid_${laborer.id}`) as HTMLInputElement | null;
        if (advanceInput) advanceInput.value = "0";
      });
      // Refetch laborers to update any derived data if necessary (e.g., total advances, though removed for now)
      // async function refetchLaborers() {
      //   const data = await getLaborers();
      //   setLaborers(data);
      // }
      // refetchLaborers();


    } else if (state.message || state.errors?.form ) { 
      toast({
        title: "Error",
        description: state.message || state.errors?.form,
        variant: "destructive",
      });
    }
  }, [state, toast, laborers]);

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Daily Labor Entries</CardTitle>
        <CardDescription>Record daily activity, attendance, and payments for all laborers for the selected date.</CardDescription>
      </CardHeader>
      <form action={dispatch} ref={formRef}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input type="hidden" name="date" value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                  />
                </PopoverContent>
              </Popover>
              {state.errors?.date && <p className="text-sm text-destructive">{state.errors.date.join(", ")}</p>}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="workDetails">Work Details (for all present laborers)</Label>
                <Textarea id="workDetails" name="workDetails" placeholder="Describe the work done, location, and any notes..." required />
                {state.errors?.workDetails && <p className="text-sm text-destructive">{state.errors.workDetails.join(", ")}</p>}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Laborer Status & Advances</h3>
            </div>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-6">
                {laborers.map((laborer, index) => (
                  <div key={laborer.id} className="p-4 rounded-md border bg-card/50 shadow-sm">
                    <input type="hidden" name={`laborerId_${index}`} value={laborer.id} />
                    <div className="flex items-center gap-3 mb-3">
                      <Image
                        src={laborer.profilePhotoUrl || `https://placehold.co/40x40.png?text=${laborer.name.charAt(0)}`}
                        alt={laborer.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover border"
                        data-ai-hint="profile person"
                      />
                      <div>
                        <h4 className="font-semibold text-md">{laborer.name}</h4>
                        {/* 
                        // Temporarily removed totalAdvancePaid display from here as it's not directly part of Laborer type from DB anymore
                        // This would require a separate query or join when daily_entries are also in DB
                        <p className="text-xs text-muted-foreground">
                            Current Total Advance: ₹{laborer.totalAdvancePaid?.toLocaleString() ?? '0'}
                        </p> 
                        */}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Presence</Label>
                            <RadioGroup name={`isPresent_${laborer.id}`} defaultValue="present" className="flex gap-4" required>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="present" id={`present_${laborer.id}`} />
                                <Label htmlFor={`present_${laborer.id}`} className="text-sm font-normal">Present</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="absent" id={`absent_${laborer.id}`} />
                                <Label htmlFor={`absent_${laborer.id}`} className="text-sm font-normal">Absent</Label>
                            </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={`advancePaid_${laborer.id}`} className="text-xs">Advance Paid Today</Label>
                            <Input 
                                id={`advancePaid_${laborer.id}`} 
                                name={`advancePaid_${laborer.id}`} 
                                type="number" 
                                placeholder="e.g. 100" 
                                defaultValue="0" 
                                min="0" 
                                className="h-9"/>
                        </div>
                    </div>
                  </div>
                ))}
                {laborers.length === 0 && <p className="text-muted-foreground text-center py-4">No laborers found. Add laborers first.</p>}
              </div>
               <input type="hidden" name="laborerCount" value={laborers.length} />
            </ScrollArea>
            {state.errors?.form && <p className="text-sm text-destructive mt-2">{state.errors.form}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-6">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
