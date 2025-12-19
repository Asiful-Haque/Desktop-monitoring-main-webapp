import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";

const CurrencyInfoCard = ({ onSubmit }) => {
  const [currencyType, setCurrencyType] = useState("");
  const [salaryType, setSalaryType] = useState("Monthly");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ currencyType, salaryType });
  };

  return (
    <Card className="border-0 backdrop-blur-xl overflow-hidden bg-white/95 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl text-[#0b2a72]">
          Setup Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Currency Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="currencyType" className="text-[#0b2a72] font-medium">
                Currency Type
              </Label>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-blue-400 cursor-help hover:text-blue-600 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm leading-snug bg-slate-900 text-white border-slate-800">
                    <p>
                      Use the <b>ISO 4217</b> currency code (3 letters), e.g.{" "}
                      <b>USD</b>, <b>EUR</b>, <b>GBP</b>, <b>BDT</b>.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Input
              id="currencyType"
              value={currencyType}
              onChange={(e) => setCurrencyType(e.target.value.toUpperCase())}
              placeholder="e.g. USD, EUR, GBP, BDT"
              // Matches the Select styling below
              className="w-full border-blue-200 focus-visible:ring-blue-500 uppercase placeholder:normal-case"
              maxLength={3}
              required
            />
          </div>

          {/* 2. Salary Type Selection */}
          <div className="space-y-2">
            <Label className="text-[#0b2a72] font-medium">Salary Frequency</Label>
            <Select 
              value={salaryType} 
              onValueChange={setSalaryType} 
              required
            >
              {/* Added w-full to match Input width exactly */}
              <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500 text-slate-700">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors mt-2"
          >
            Complete Registration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CurrencyInfoCard;