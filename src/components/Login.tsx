import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (error) throw error;
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
        setError(err.message || "Authentication failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#09090b] text-zinc-100">
        <div className="w-full max-w-sm p-8 bg-transparent">
            <h1 className="text-2xl font-bold mb-6 text-center tracking-tight text-white">
                {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            required 
                            className="bg-zinc-900 border-zinc-700 focus-visible:ring-zinc-600"
                            placeholder="Your name"
                        />
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="bg-zinc-900 border-zinc-700 focus-visible:ring-zinc-600"
                         placeholder="m@example.com"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        className="bg-zinc-900 border-zinc-700 focus-visible:ring-zinc-600"
                    />
                </div>
                {error && <p className="text-red-400 text-xs px-1">{error}</p>}
                <Button 
                    type="submit" 
                    className="w-full bg-zinc-100 text-zinc-900 cursor-pointer hover:bg-zinc-200" 
                    disabled={loading}
                >
                    {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Sign In")}
                </Button>
            </form>
            <div className="mt-6 text-center text-xs text-zinc-500">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button 
                    onClick={() => setIsSignUp(!isSignUp)} 
                    className="text-zinc-300 hover:underline font-medium cursor-pointer hover:text-white transition-colors"
                >
                    {isSignUp ? "Sign In" : "Sign Up"}
                </button>
            </div>
        </div>
    </div>
  );
}
