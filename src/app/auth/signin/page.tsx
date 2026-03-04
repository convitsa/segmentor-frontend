"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { GoogleLogin } from "@react-oauth/google";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AuthResponse } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "Segmentor transformed how we engage visitors. Conversions jumped 34% in the first month.",
    name: "Sarah Chen",
    role: "Head of Growth, Acme SaaS",
    avatar: "https://i.pravatar.cc/80?img=32",
  },
  {
    quote: "The visual editor is magic. Our marketing team personalizes pages without touching code.",
    name: "James Rodriguez",
    role: "VP Marketing, CloudStack",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    quote: "We tested 12 variants across 5 audiences in a single afternoon. Incredible tool.",
    name: "Emily Nakamura",
    role: "Product Lead, Shopwave",
    avatar: "https://i.pravatar.cc/80?img=23",
  },
  {
    quote: "One script tag, zero engineering overhead. The ROI has been off the charts.",
    name: "Mark Olsen",
    role: "CTO, DataBridge",
    avatar: "https://i.pravatar.cc/80?img=53",
  },
];

const signinSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function LeftBrandPanel() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const t = TESTIMONIALS[current];

  return (
    <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08),transparent_70%)]" />
      <div className="absolute top-12 left-10 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute bottom-16 right-8 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute top-1/4 right-16 h-20 w-20 rounded-full border border-white/10" />
      <div className="absolute bottom-1/3 left-14 h-12 w-12 rounded-full border border-white/10" />

      <div className="relative z-10 flex flex-col items-start gap-8 p-14 pt-16 w-full">
        <div className="flex items-center">
          <img src="/logo-white.svg" alt="Segmentor" className="h-9" />
        </div>

        <div className="mt-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            No-Code Personalization for Solopreneurs
          </h1>
          <p className="text-white/60 text-lg mt-3 leading-relaxed">
            Target audiences, personalize content, and boost conversions — without writing a single line of code.
          </p>
        </div>

        <div className="w-full rounded-2xl bg-white/10 backdrop-blur-sm p-8 mt-4 min-h-[200px] flex flex-col justify-between">
          <Quote className="h-7 w-7 text-white/25 mb-3" />
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-white/90 text-xl leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="h-17 w-17 rounded-full object-cover ring-2 ring-white/20"
                />
                <div>
                  <p className="text-white text-xl font-semibold">{t.name}</p>
                  <p className="text-white/50 text-lg">{t.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-1.5 mt-5">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-7 bg-white" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onSwitch, onGoogleSuccess, loading }: {
  onSwitch: () => void;
  onGoogleSuccess: (cred: { credential?: string }) => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  async function redirectAfterAuth() {
    try {
      const sub = await api.get<{ subscription: { status: string } | null }>("/api/billing/subscription");
      if (sub.subscription?.status === "active" || sub.subscription?.status === "trialing") {
        router.push("/dashboard/projects");
      } else {
        router.push("/billing");
      }
    } catch {
      router.push("/billing");
    }
  }

  async function onSubmit(data: z.infer<typeof signinSchema>) {
    setSubmitting(true);
    try {
      const res = await api.post<AuthResponse>("/api/auth/login", data);
      login(res.token, res.user);
      toast.success("Welcome back!");
      await redirectAfterAuth();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center mb-8 lg:hidden">
        <img src="/logo.svg" alt="Segmentor" className="h-8" />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your Segmentor account</p>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={onGoogleSuccess}
          onError={() => toast.error("Google sign in failed")}
          width="350"
          theme={theme === "dark" ? "filled_black" : "outline"}
          shape="rectangular"
          text="signin_with"
        />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Form>

      <p className="text-sm text-center text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <button onClick={onSwitch} className="text-primary font-medium hover:underline">
          Sign up
        </button>
      </p>
    </>
  );
}

function SignUpForm({ onSwitch, onGoogleSuccess, loading }: {
  onSwitch: () => void;
  onGoogleSuccess: (cred: { credential?: string }) => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "" },
  });

  async function redirectAfterAuth() {
    try {
      const sub = await api.get<{ subscription: { status: string } | null }>("/api/billing/subscription");
      if (sub.subscription?.status === "active" || sub.subscription?.status === "trialing") {
        router.push("/dashboard/projects");
      } else {
        router.push("/billing");
      }
    } catch {
      router.push("/billing");
    }
  }

  async function onSubmit(data: z.infer<typeof signupSchema>) {
    setSubmitting(true);
    try {
      const res = await api.post<AuthResponse>("/api/auth/signup", data);
      login(res.token, res.user);
      toast.success("Account created!");
      await redirectAfterAuth();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center mb-8 lg:hidden">
        <img src="/logo.svg" alt="Segmentor" className="h-8" />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
        <p className="text-muted-foreground text-sm mt-1">Get started with Segmentor</p>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={onGoogleSuccess}
          onError={() => toast.error("Google sign up failed")}
          width="350"
          theme={theme === "dark" ? "filled_black" : "outline"}
          shape="rectangular"
          text="signup_with"
        />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" placeholder="At least 8 characters" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      </Form>

      <p className="text-sm text-center text-muted-foreground mt-6">
        Already have an account?{" "}
        <button onClick={onSwitch} className="text-primary font-medium hover:underline">
          Sign in
        </button>
      </p>
    </>
  );
}

function AuthPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [loading, setLoading] = useState(false);

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) {
      toast.error("Google sign in failed");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>("/api/auth/google", {
        idToken: credentialResponse.credential,
      });
      login(res.token, res.user);
      toast.success(mode === "signup" ? "Welcome to Segmentor!" : "Welcome back!");

      try {
        const sub = await api.get<{ subscription: { status: string } | null }>("/api/billing/subscription");
        if (sub.subscription?.status === "active" || sub.subscription?.status === "trialing") {
          router.push("/dashboard/projects");
        } else {
          router.push("/billing");
        }
      } catch {
        router.push("/billing");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative">
      <LeftBrandPanel />

      <div className="flex-1 flex items-center justify-center bg-background px-6 overflow-hidden">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: mode === "signup" ? -30 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: mode === "signup" ? 30 : -30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {mode === "signin" ? (
                <SignInForm
                  onSwitch={() => setMode("signup")}
                  onGoogleSuccess={handleGoogleSuccess}
                  loading={loading}
                />
              ) : (
                <SignUpForm
                  onSwitch={() => setMode("signin")}
                  onGoogleSuccess={handleGoogleSuccess}
                  loading={loading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
