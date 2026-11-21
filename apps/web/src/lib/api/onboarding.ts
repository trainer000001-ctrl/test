"use client";

import { buildCsrfLogoutInit, requestApiJson } from "@moonwitness/contracts/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifySessionChange } from "@/lib/session";

const API_BASE = "/api/v1/control";

export interface SetupInstance {
  id: string;
  name: string;
  initialized_at?: string;
  version: string;
}

export interface SetupStatus {
  initialized: boolean;
  version: string;
  instance: SetupInstance;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "readonly";
  created_at: string;
  last_login_at?: string;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const body = await requestApiJson<T>(url, init);
  if (body === null || typeof body !== "object") {
    throw new Error("The control plane returned an unreadable response.");
  }
  return body;
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ["control", "setup", "status"],
    queryFn: () => requestJson<SetupStatus>(`${API_BASE}/setup/status`),
    retry: 1,
    staleTime: 10_000,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["control", "auth", "me"],
    queryFn: () => requestJson<{ user: AuthUser }>(`${API_BASE}/auth/me`),
    retry: false,
    staleTime: 30_000,
  });
}

export interface SuperuserInput {
  name: string;
  email: string;
  password: string;
  instanceName: string;
}

export function useCreateSuperuser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SuperuserInput) =>
      requestJson<{ user: AuthUser; initialized: boolean }>(`${API_BASE}/setup/superuser`, {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          instance_name: input.instanceName,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control", "setup"] });
      queryClient.invalidateQueries({ queryKey: ["control", "auth"] });
      notifySessionChange();
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      requestJson<{ user: AuthUser }>(`${API_BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control"] });
      notifySessionChange();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      requestJson<{ ok: boolean }>(`${API_BASE}/auth/logout`, buildCsrfLogoutInit()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control"] });
      notifySessionChange();
    },
  });
}
