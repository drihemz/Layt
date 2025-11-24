import { Waves } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[800px]">
      <div className="text-center">
        <div className="relative">
          <Waves className="w-16 h-16 text-ocean-500 animate-wave mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-ocean-200 border-t-ocean-500 rounded-full animate-spin"></div>
          </div>
        </div>
        <p className="mt-6 text-gray-600 font-medium">Loading dashboard...</p>
      </div>
    </div>
  );
}
