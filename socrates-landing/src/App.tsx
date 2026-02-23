import { useState, useEffect } from 'react';
import { ArrowRight, Lightbulb, Zap, Target, Menu, X } from 'lucide-react';
import './App.css';

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen font-sans bg-gradient-premium">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'glass py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="text-xl font-bold text-violet-500">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Socrates AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
            <button className="px-5 py-2.5 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              Get Started
            </button>
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-6 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-violet-500"></span>
            Now in Early Access
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] mb-8 text-gradient">
            Stop Asking.<br />Start Thinking.
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            Experience the power of Socratic questioning. Our AI doesn't just give answers; <span className="text-violet-400">it helps you find them</span> through deep, guided inquiry.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-violet-600 text-white font-bold text-lg hover:bg-violet-500 transition-all flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(139,92,246,0.4)]">
              Start Your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>
      </section>

      {/* Product Preview */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass rounded-3xl overflow-hidden shadow-2xl border-white/5 relative">
            <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-6 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/20"></div>
              </div>
              <div className="mx-auto text-[10px] text-slate-500 font-mono tracking-widest uppercase">Deep Thinking Session</div>
            </div>
            <div className="p-8 md:p-12 space-y-8">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
                  <span className="text-xs font-semibold text-slate-500">You</span>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 max-w-lg">
                  How do I find my true purpose in life?
                </div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-3 mb-2 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs text-white">S</div>
                  <span className="text-xs font-semibold text-violet-400">Socrates AI</span>
                </div>
                <div className="p-5 rounded-2xl glass border border-violet-500/20 text-white max-w-lg shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                  Is your purpose something you find waiting for you, or something you build through each choice you make?
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
                <div className="flex justify-between w-full max-w-xs text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-2">
                  <span>Surface Level</span>
                  <span>Deep Inquiry</span>
                </div>
                <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-600 to-blue-500 w-[65%] shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                </div>
                <span className="mt-4 text-xs font-medium text-slate-400">Current Depth: 65%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Master the Art of Thinking</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Our methodology is rooted in classical philosophy, enhanced by modern intelligence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Lightbulb className="text-amber-400" />,
                title: "Deep Inquiry",
                desc: "Move beyond surface-level answers. Tackle the root cause of your uncertainty."
              },
              {
                icon: <Zap className="text-violet-400" />,
                title: "Critical Thinking",
                desc: "Identify logical fallacies in your own reasoning and expand your mental horizons."
              },
              {
                icon: <Target className="text-blue-400" />,
                title: "Self-Discovery",
                desc: "Uncover truths that were always inside you, waiting for the right question."
              }
            ].map((f, i) => (
              <div key={i} className="group p-10 rounded-3xl glass hover:bg-white/5 transition-all border-white/5 hover:border-violet-500/30">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Footer */}
      <footer className="bg-footer-bg text-gray-400 border-t border-gray-800 py-8 px-6" data-purpose="business-footer">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4 text-xs leading-relaxed" data-purpose="footer-info-container">
            <div className="flex flex-wrap gap-x-4 gap-y-1" data-purpose="company-details">
              <span className="font-semibold text-gray-200">상호명: 뉴이어</span>
              <span className="before:content-['|'] before:mr-4 before:text-gray-700">대표자: 최용호</span>
              <span className="before:content-['|'] before:mr-4 before:text-gray-700">사업자등록번호: 778-27-01716</span>
            </div>
            <div className="flex flex-col space-y-1" data-purpose="contact-address">
              <p>주소: 경기도 부천시 원미구 소향로 223, 1519호</p>
              <p>고객센터: 010-9369-5349</p>
            </div>
            <div className="pt-4 mt-4 border-t border-gray-800/50" data-purpose="copyright-notice">
              <p className="text-gray-500">ⓒ 2025 뉴이어. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
