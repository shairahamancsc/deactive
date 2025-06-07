
"use client";

import type { AddLaborerState } from "@/lib/actions"; // Re-using for message structure
import { deleteLaborerAction } from "@/lib/actions";
import type { Laborer } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Fingerprint, Phone, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

interface LaborerCardProps {
  laborer: Laborer;
}

function DeleteConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Confirm Delete
    </AlertDialogAction>
  );
}

export function LaborerCard({ laborer }: LaborerCardProps) {
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const initialState: AddLaborerState = { message: undefined, errors: undefined, success: false };
  const [state, dispatchDelete] = useActionState(deleteLaborerAction, initialState);

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast({
          title: "Success!",
          description: state.message,
        });
        setIsAlertOpen(false); // Close dialog on success
        // The revalidatePath in the action will handle UI update
      } else {
        toast({
          title: "Error",
          description: state.message,
          variant: "destructive",
        });
      }
    }
  }, [state, toast]);

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Image
          src={laborer.profilePhotoUrl || `https://placehold.co/80x80.png?text=${laborer.name.charAt(0)}`}
          alt={laborer.name}
          width={64}
          height={64}
          className="rounded-full border-2 border-primary object-cover"
          data-ai-hint="profile person"
        />
        <div className="flex-1">
          <CardTitle className="text-xl font-headline">{laborer.name}</CardTitle>
          <CardDescription className="flex items-center gap-1 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {laborer.mobileNo}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Aadhaar:</span>
            <span>{laborer.aadhaarNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">PAN:</span>
            <span>{laborer.panNo}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 mt-auto">
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Laborer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                laborer and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={dispatchDelete} className="contents">
                <input type="hidden" name="laborerId" value={laborer.id} />
                <DeleteConfirmButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
