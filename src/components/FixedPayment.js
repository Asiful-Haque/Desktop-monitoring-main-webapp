"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Assuming Input is a component you are using
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea is a component you are using
import { toast } from "sonner";

export default function FixedPayment() {
  // Form state
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [payment, setPayment] = useState("");
  const [note, setNote] = useState("");

  // Handle submit
  const handleSubmit = async () => {
    // Validation for required fields
    if (!name || !project || !payment) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // Assuming you have an API endpoint to process the payment
      const response = await fetch("/api/process-fixed-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          project,
          payment: Number(payment), // Ensure payment is a number
          note,
        }),
      });

      if (response.ok) {
        toast.success("Payment processed successfully");
        // Clear the form after successful submission
        setName("");
        setProject("");
        setPayment("");
        setNote("");
      } else {
        toast.error("Failed to process the payment");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Error processing the payment");
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-2 border-blue-500 ">
        <CardHeader className="px-4">
          <CardDescription><h1 className="text-3xl font-bold flex items-center text-black">
                  Fixed Payment
                </h1></CardDescription>
        </CardHeader>

        <CardContent className="px-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-lg font-medium">Name</label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 "
                placeholder="Enter the name"
              />
            </div>

            <div>
              <label htmlFor="project" className="block text-lg font-medium">Project</label>
              <Input
                id="project"
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="mt-1"
                placeholder="Enter the project name"
              />
            </div>

            <div>
              <label htmlFor="payment" className="block text-lg font-medium">Payment Amount</label>
              <Input
                id="payment"
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="mt-1 "
                placeholder="Enter the payment amount"
              />
            </div>

            <div>
              <label htmlFor="note" className="block text-lg font-medium">Note</label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
                placeholder="Enter any notes here"
              />
            </div>

            {/* Submit Button */}
            <div className="mt-4">
              <Button onClick={handleSubmit} className="w-full lg:w-auto px-3 py-2 rounded-md text-sm font-medium transition
    shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 bg-indigo-600 text-white hover:bg-indigo-700">
                Submit Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
