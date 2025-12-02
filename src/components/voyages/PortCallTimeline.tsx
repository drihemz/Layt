import { Compass, MapPin, Ship, Flag, Anchor } from "lucide-react";

type PortCall = {
  id: string;
  port_name?: string | null;
  activity?: string | null;
  sequence?: number | null;
  eta?: string | null;
  etd?: string | null;
  status?: string | null;
};

const activityIcon = (activity?: string | null) => {
  if (activity === "load") return <Anchor className="w-4 h-4 text-[#17694c]" />;
  if (activity === "discharge") return <Flag className="w-4 h-4 text-[#b45c1d]" />;
  return <MapPin className="w-4 h-4 text-[#0f6d82]" />;
};

export function PortCallTimeline({ ports, activeId }: { ports: PortCall[]; activeId?: string }) {
  if (!ports || ports.length === 0) {
    return <p className="text-sm text-slate-500">No port calls yet.</p>;
  }

  return (
    <div className="space-y-4">
      {ports.map((pc, idx) => {
        const isActive = activeId && pc.id === activeId;
        return (
          <div key={pc.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                  isActive ? "bg-[#1f5da8] border-[#1f5da8]" : "bg-white border-slate-200"
                }`}
              >
                {idx === 0 ? <Ship className={`w-4 h-4 ${isActive ? "text-white" : "text-[#1f5da8]"}`} /> : activityIcon(pc.activity)}
              </div>
              {idx !== ports.length - 1 && <div className="flex-1 w-px bg-slate-200" />}
            </div>
            <div className={`flex-1 rounded-xl border ${isActive ? "border-[#1f5da8]/50 bg-[#1f5da8]/5" : "border-slate-200 bg-white"} p-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">
                    {pc.sequence || ""} {pc.port_name || "Port"} {pc.activity ? `(${pc.activity})` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    ETA {pc.eta || "—"} · ETD {pc.etd || "—"}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {pc.status || "planned"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
