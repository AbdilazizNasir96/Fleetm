import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { UserProfile, Tenant, UserTenantMembership } from "@workspace/api-client-react";
import { setAuthToken, getAuthToken } from "../lib/api";
import { useLocation } from "wouter";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  currentTenant: Tenant | null;
  currentRole: string | null;
  tenants: UserTenantMembership[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: UserProfile, tenant: Tenant, role: string) => void;
  logout: () => void;
  updateState: (updates: Partial<AuthState>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: getAuthToken(),
    user: null,
    currentTenant: null,
    currentRole: null,
    tenants: [],
    isAuthenticated: !!getAuthToken(),
    isLoading: true,
  });

  const [, setLocation] = useLocation();

  const { data: meData, isLoading: isMeLoading, isError: isMeError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!state.token,
      retry: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setState(prev => ({
        ...prev,
        user: meData.user,
        currentTenant: meData.currentTenant || null,
        currentRole: meData.currentRole || null,
        tenants: meData.tenants,
        isAuthenticated: true,
        isLoading: false,
      }));
    } else if (isMeError || (!state.token && state.isLoading)) {
      setState(prev => ({
        ...prev,
        token: null,
        user: null,
        currentTenant: null,
        currentRole: null,
        tenants: [],
        isAuthenticated: false,
        isLoading: false,
      }));
      setAuthToken(null);
    }
  }, [meData, isMeError, state.token, state.isLoading]);

  const login = (token: string, user: UserProfile, tenant: Tenant, role: string) => {
    setAuthToken(token);
    setState({
      token,
      user,
      currentTenant: tenant,
      currentRole: role,
      tenants: [], // Will be populated on next me fetch
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    setAuthToken(null);
    setState({
      token: null,
      user: null,
      currentTenant: null,
      currentRole: null,
      tenants: [],
      isAuthenticated: false,
      isLoading: false,
    });
    setLocation("/login");
  };

  const updateState = (updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
