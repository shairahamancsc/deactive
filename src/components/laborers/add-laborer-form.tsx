
"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { addLaborerAction, type AddLaborerState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, UserCircle2, UploadCloud } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Add Laborer
    </Button>
  );
}

export function AddLaborerForm() {
  const initialState: AddLaborerState = { message: undefined, errors: undefined, success: false };
  const [state, dispatch] = useActionState(addLaborerAction, initialState);
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview("");
    }
  };

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success!",
        description: state.message,
      });
      // Optionally reset form or redirect here
      setPhotoPreview(""); // Reset preview on success
    } else if (state.message && state.errors) { 
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, toast]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Add New Laborer</CardTitle>
        <CardDescription>Fill in the details below to add a new laborer to the system.</CardDescription>
      </CardHeader>
      <form action={dispatch}>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-2 mb-4">
            <Label htmlFor="photoFile" className="cursor-pointer block">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Profile Preview"
                  width={128}
                  height={128}
                  className="rounded-full object-cover w-32 h-32 border-2 border-muted hover:border-primary transition-colors"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-card flex items-center justify-center border-2 border-dashed border-muted hover:border-primary transition-colors">
                  <UserCircle2 className="w-20 h-20 text-muted-foreground" />
                </div>
              )}
            </Label>
            <Label htmlFor="photoFile" className="cursor-pointer text-sm text-primary hover:underline flex items-center gap-1.5 pt-1">
              <UploadCloud className="h-4 w-4" />
              Upload Photo
            </Label>
            <Input
              id="photoFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <Input
              type="hidden"
              name="profilePhotoUrl"
              value={photoPreview}
            />
            {state.errors?.profilePhotoUrl && (
              <p className="text-xs text-destructive pt-1">{state.errors.profilePhotoUrl.join(", ")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" placeholder="e.g. John Doe" required />
            {state.errors?.name && <p className="text-sm text-destructive">{state.errors.name.join(", ")}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="mobileNo">Mobile Number</Label>
              <Input id="mobileNo" name="mobileNo" type="tel" placeholder="10-digit mobile number" required />
              {state.errors?.mobileNo && <p className="text-sm text-destructive">{state.errors.mobileNo.join(", ")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="aadhaarNo">Aadhaar Number</Label>
              <Input id="aadhaarNo" name="aadhaarNo" placeholder="12-digit Aadhaar number" required />
              {state.errors?.aadhaarNo && <p className="text-sm text-destructive">{state.errors.aadhaarNo.join(", ")}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panNo">PAN Number</Label>
            <Input id="panNo" name="panNo" placeholder="e.g. ABCDE1234F" required />
            {state.errors?.panNo && <p className="text-sm text-destructive">{state.errors.panNo.join(", ")}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-6">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
