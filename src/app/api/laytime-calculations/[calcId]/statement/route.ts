import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const TEST_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LAYTIME_TEST === "true";

export async function GET(_req: Request, { params }: { params: { calcId: string } }) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data: calc, error } = await supabase
    .from("laytime_calculations")
    .select("*")
    .eq("id", params.calcId)
    .eq("tenant_id", session.user.tenantId)
    .single();
  if (error || !calc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: rows }, { data: portCalls }, { data: cargoes }] = await Promise.all([
    supabase
      .from("cargo_port_laytime_rows")
      .select("*")
      .eq("laytime_calculation_id", params.calcId)
      .eq("tenant_id", session.user.tenantId),
    supabase
      .from("port_calls")
      .select("id, port_name, activity, sequence")
      .eq("voyage_id", calc.voyage_id)
      .order("sequence", { ascending: true }),
    supabase
      .from("cargoes")
      .select("id, cargo_name, quantity, unit")
      .eq("voyage_id", calc.voyage_id)
      .eq("tenant_id", session.user.tenantId),
  ]);

  const statementJson = {
    header: {
      calculationId: calc.id,
      voyageId: calc.voyage_id,
      status: calc.status,
      method: calc.calculation_method,
      totals: {
        allowedMinutes: calc.time_allowed_minutes,
        usedMinutes: calc.time_used_minutes,
        demurrageMinutes: calc.time_on_demurrage_minutes,
        despatchMinutes: calc.time_on_despatch_minutes,
        demurrageAmount: calc.demurrage_amount,
        despatchAmount: calc.despatch_amount,
        onceOnDemurrage: (calc.time_on_demurrage_minutes || 0) > 0 && (calc.time_used_minutes || 0) > (calc.time_allowed_minutes || 0),
      },
    },
    cargoPortRows: (rows || []).map((r: any) => ({
      cargo: cargoes?.find((c) => c.id === r.cargo_id) || { id: r.cargo_id },
      port: portCalls?.find((p) => p.id === r.port_call_id) || { id: r.port_call_id },
      allowedMinutes: r.laytime_allowed_minutes,
      usedMinutes: r.laytime_used_minutes,
      deductionsMinutes: r.deductions_minutes,
      additionsMinutes: r.additions_minutes,
      demurrageMinutes: r.time_on_demurrage_minutes,
      despatchMinutes: r.time_on_despatch_minutes,
    })),
  };

  const statementHtml = `
    <html><body>
      <h2>Laytime Statement</h2>
      <p>Calc: ${calc.id}</p>
      <p>Voyage: ${calc.voyage_id}</p>
      <p>Status: ${calc.status} · Method: ${calc.calculation_method}</p>
      <h3>Totals</h3>
      <ul>
        <li>Allowed: ${calc.time_allowed_minutes} min</li>
        <li>Used: ${calc.time_used_minutes} min</li>
        <li>Demurrage: ${calc.time_on_demurrage_minutes} min (${calc.demurrage_amount})</li>
        <li>Despatch: ${calc.time_on_despatch_minutes} min (${calc.despatch_amount})</li>
      </ul>
      <h3>Lines</h3>
      <ul>
        ${(rows || [])
          .map(
            (r: any) =>
              `<li>${r.cargo_id} @ ${r.port_call_id}: Allowed ${r.laytime_allowed_minutes}m, Used ${r.laytime_used_minutes}m, Dem ${r.time_on_demurrage_minutes}m, Desp ${r.time_on_despatch_minutes}m</li>`
          )
          .join("")}
      </ul>
    </body></html>
  `;

  return NextResponse.json({ statementJson, statementHtml });
}
