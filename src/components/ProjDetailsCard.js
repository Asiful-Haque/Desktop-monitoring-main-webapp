import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ProjDetailsCard({ project }) {
  return (
<Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-blue-700">Project Information</CardTitle>
          <CardDescription>
            Detailed project information and metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Client</h4>
              <p className="text-gray-600">{project.client}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Category</h4>
              <p className="text-gray-600">{project.category}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Created Date</h4>
              <p className="text-gray-600">{project.createdDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>
  )
}

export default ProjDetailsCard
