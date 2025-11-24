/**
 * Database helper functions with strict tenant isolation
 * All queries automatically filter by tenant_id for security
 */

import { supabase } from "./supabase";
import { Session } from "next-auth";

/**
 * Get Supabase client with tenant context
 * Automatically adds tenant_id filter to all queries
 */
export function getTenantClient(session: Session | null) {
  if (!session?.user?.tenantId) {
    // For super_admin, tenantId can be null. We should handle this gracefully
    // or ensure that getTenantClient is not called for super_admin specific views.
    if (session?.user?.role !== 'super_admin') {
      throw new Error("No tenant context available");
    }
  }

  const tenantId = session.user.tenantId;
  const role = session.user.role;

  return {
    // Voyages - tenant isolated
    voyages: {
      list: async ({ search, page = 1, pageSize = 10 }: { search?: string; page?: number; pageSize?: number }) => {
        let query = supabase
          .from("voyages")
          .select(`
            id, voyage_reference, vessel_id, voyage_number, created_at,
            vessels(name),
            owner:owner_id(name),
            charterer:charterer_id(name),
            cargo_names(name)
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);
        
        if (search) {
          query = query.ilike("voyage_reference", `%${search}%`);
        }

        return query;
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from("voyages")
          .select("*")
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single();

        if (error) throw error;
        return data;
      },
      create: async (data: any) => {
        const { data: result, error } = await supabase
          .from("voyages")
          .insert({
            ...data,
            tenant_id: tenantId,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return result;
      },
      update: async (id: string, data: any) => {
        const { data: result, error } = await supabase
          .from("voyages")
          .update(data)
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select()
          .single();

        if (error) throw error;
        return result;
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from("voyages")
          .delete()
          .eq("id", id)
          .eq("tenant_id", tenantId);

        if (error) throw error;
      },
    },

    // Claims - tenant isolated
    claims: {
      list: async (limit = 30) => {
        const query = supabase
          .from("claims")
          .select(`
            *,
            voyages(voyage_reference, voyage_number),
            counterparty:counterparty_id(name),
            ports(name),
            terms(name),
            cargo_names(name)
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(limit);

        return query;
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from("claims")
          .select("*")
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single();

        if (error) throw error;
        return data;
      },
      create: async (data: any) => {
        const { data: result, error } = await supabase
          .from("claims")
          .insert({
            ...data,
            tenant_id: tenantId,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return result;
      },
      update: async (id: string, data: any) => {
        const { data: result, error } = await supabase
          .from("claims")
          .update(data)
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .select()
          .single();

        if (error) throw error;
        return result;
      },
    },

    // Lookup data - tenant isolated
    lookup: {
      vessels: async () => {
        const { data, error } = await supabase
          .from("vessels")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");

        if (error) throw error;
        return data;
      },
      charterParties: async () => {
        const { data, error } = await supabase
          .from("charter_parties")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");

        if (error) throw error;
        return data;
      },
      cargoNames: async () => {
        const { data, error } = await supabase
          .from("cargo_names")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");

        if (error) throw error;
        return data;
      },
      parties: async () => {
        const { data, error } = await supabase
          .from("parties")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");
      
        if (error) throw error;
        return data;
      },
      ports: async () => {
        const { data, error } = await supabase
          .from("ports")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");

        if (error) throw error;
        return data;
      },
      terms: async () => {
        const { data, error } = await supabase
          .from("terms")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");

        if (error) throw error;
        return data;
      },
    },

    // Users - only for customer admins and super admins
    users: {
      list: async () => {
        if (role !== "customer_admin" && role !== "super_admin") {
          throw new Error("Unauthorized");
        }
        // Handle super_admin case where tenantId is null
        const query = supabase.from("users").select("*");
        if (tenantId) {
          query.eq("tenant_id", tenantId);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      },
    },
  };
}

