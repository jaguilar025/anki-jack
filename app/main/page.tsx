import Dashboard from "@/components/dashboard"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-background/90">
      <div className="w-full max-w-4xl">
        <Dashboard />
      </div>
    </main>
  )
}
