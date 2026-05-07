import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bus, Lock } from "lucide-react";
import { setAuthToken } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLoginUser();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setAuthToken(res.token);
          login(res.token, res.user as any, res.tenant as any, res.role);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({
            title: "Login failed",
            description: err?.data?.error ?? "Invalid email or password",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Bus className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-sidebar-foreground text-xl font-bold">Digivant Solutions</span>
        </div>
        <div>
          <h1 className="text-sidebar-foreground text-4xl font-bold leading-tight mb-4">
            School Transport<br />Command Center
          </h1>
          <p className="text-sidebar-foreground/60 text-lg">
            Real-time fleet management, route optimization, and student safety — all in one platform.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Routes", value: "24/7" },
            { label: "Student Safety", value: "100%" },
            { label: "On-Time Rate", value: "97.3%" },
          ].map((stat) => (
            <div key={stat.label} className="bg-sidebar-accent rounded-lg p-4">
              <p className="text-sidebar-primary text-2xl font-bold">{stat.value}</p>
              <p className="text-sidebar-foreground/50 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Bus className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Digivant Solutions</span>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
            <p className="text-muted-foreground text-sm mt-1">Access your transport management dashboard</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="admin@school.edu"
                        data-testid="input-email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                data-testid="button-submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            New organization?{" "}
            <a href="/register" className="text-foreground font-medium hover:underline" data-testid="link-register">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
