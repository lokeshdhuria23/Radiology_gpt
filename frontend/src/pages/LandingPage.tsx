import { useNavigate } from 'react-router-dom'
import {
  Stethoscope,
  Brain,
  Shield,
  Activity,
  FileSearch,
  HeartPulse,
  Scan,
  ArrowRight,
  Sparkles,
  Users,
  UserCog,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Six specialized clinical agents analyze patient data, images, and labs simultaneously.',
  },
  {
    icon: Scan,
    title: 'Radiology Intelligence',
    desc: 'Multimodal vision models trained on ROCO interpret chest radiographs with lab correlation.',
  },
  {
    icon: Shield,
    title: 'Clinical Safety Engine',
    desc: 'Real-time drug interaction checks, allergy alerts, and abnormal lab flagging.',
  },
  {
    icon: FileSearch,
    title: 'RAG Knowledge Base',
    desc: '11 clinical guidelines searchable via vector embeddings — ACR, Fleischner, ADA, and more.',
  },
  {
    icon: HeartPulse,
    title: 'Patient Monitoring',
    desc: 'Longitudinal vitals tracking, trend analysis, and clinical decision support dashboards.',
  },
  {
    icon: Activity,
    title: 'Structured Reports',
    desc: 'Auto-generated radiology reports with clinician review workflows and audit trails.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 text-white overflow-hidden">
      {/* Animated Background Grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating Orbs */}
      <div className="pointer-events-none fixed top-20 left-10 h-72 w-72 rounded-full bg-primary-500/10 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-20 right-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-[120px]" />
      <div className="pointer-events-none fixed top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-[80px]" />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-cyan-500 shadow-lg shadow-primary-500/20">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">RadiologyGPT</span>
            <span className="ml-2 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-semibold text-primary-300 uppercase tracking-wider">CDSS</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition hover:text-white cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:shadow-primary-500/40 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-20 text-center md:pt-24 md:pb-28">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400/20 to-cyan-400/20 ring-1 ring-primary-400/30">
          <Sparkles className="h-8 w-8 text-primary-400" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <span className="block">AI-Powered Clinical</span>
          <span className="mt-2 block bg-gradient-to-r from-primary-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
            Decision Support
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 leading-relaxed">
          RadiologyGPT combines multimodal AI agents, real-time safety checks, and evidence-based knowledge retrieval to assist clinicians in making faster, safer decisions.
        </p>

        {/* CTA Portals */}
        <div className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate('/login', { state: { portal: 'doctor' } })}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-primary-600/20 transition-all hover:shadow-primary-500/40 hover:-translate-y-0.5 sm:w-auto cursor-pointer"
          >
            <UserCog className="h-5 w-5" />
            Doctor Portal
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/login', { state: { portal: 'patient' } })}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/10 backdrop-blur transition-all hover:bg-white/10 hover:-translate-y-0.5 sm:w-auto cursor-pointer"
          >
            <Users className="h-5 w-5" />
            Patient Portal
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Intelligent Clinical Workflow</h2>
          <p className="mt-3 text-gray-400">
            Six specialized AI agents working together to support clinical decision-making
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur transition-all hover:border-primary-500/20 hover:bg-white/[0.04]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 transition-colors group-hover:bg-primary-500/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center">
        <p className="text-xs text-gray-500">
          ⚠️ RadiologyGPT is an AI-powered decision support tool. All outputs are for clinical reference only and must be reviewed by a qualified medical professional before any clinical action.
        </p>
        <p className="mt-2 text-xs text-gray-600">
          © 2026 RadiologyGPT — Built with BioMistral, BiomedCLIP, Supabase pgvector & FastAPI
        </p>
      </footer>
    </div>
  )
}
