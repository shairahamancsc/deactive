
"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect } from "react";
import { analyzeWorkAction, type AnalyzeWorkState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BrainCircuit, Sparkles } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Analyze Descriptions
    </Button>
  );
}

export function WorkAnalysisTool() {
  const initialState: AnalyzeWorkState = { message: undefined, errors: undefined, analysisResult: undefined, success: false };
  const [state, dispatch] = useActionState(analyzeWorkAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success && state.message) {
      toast({
        title: "Analysis Complete",
        description: state.message,
      });
    } else if (!state.success && state.message) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, toast]);

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <CardTitle className="font-headline text-2xl">Work Description Analysis</CardTitle>
          </div>
          <CardDescription>
            Enter comma-separated work descriptions. The AI will analyze them to identify commonly used material quantities for different tasks.
          </CardDescription>
        </CardHeader>
        <form action={dispatch}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workDescriptions">Work Descriptions</Label>
              <Textarea
                id="workDescriptions"
                name="workDescriptions"
                placeholder="e.g., Foundation concrete pouring for Site A, Brickwork for 10x12 room at Site B, Plastering of exterior walls for Building C..."
                rows={6}
                required
              />
              {state.errors?.workDescriptions && <p className="text-sm text-destructive">{state.errors.workDescriptions.join(", ")}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>

      {state.analysisResult && (
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Analysis Results</CardTitle>
            <CardDescription>Summary of commonly used material quantities:</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm font-code">
              {state.analysisResult}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
