import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Ensure this is a named import { Label }
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CompanyInfoCard = ({ onNext }) => {
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext({ companyName, companyType });
  };

  return (
    <Card className="border-0 backdrop-blur-xl overflow-hidden bg-white/95 shadow-2xl">
      <CardHeader>
        {/* Replaced style={{ color... }} with text-[#0b2a72] */}
        <CardTitle className="text-xl text-[#0b2a72]">
          Company Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {/* Replaced style={{ color... }} with text-[#0b2a72] */}
            <Label htmlFor="companyName" className="text-[#0b2a72] font-medium">
              Company Name
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="border-blue-200 focus-visible:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyType" className="text-[#0b2a72] font-medium">
              Company Type
            </Label>
            <Input
              id="companyType"
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              placeholder="e.g. Technology, Retail, etc."
              className="border-blue-200 focus-visible:ring-blue-500"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Next Step
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompanyInfoCard;