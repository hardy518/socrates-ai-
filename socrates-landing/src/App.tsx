import { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, Zap, Target, Menu, X, CheckCircle2, Code2, Briefcase, PenTool, BarChart3, Binary, Sparkles, Send } from 'lucide-react';
import './App.css';

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroPrompt, setHeroPrompt] = useState('');
  const [ctaPrompt, setCtaPrompt] = useState('');

  const launchApp = (queryOrPath?: string) => {
    const mainAppUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '';

    if (!queryOrPath) {
      window.location.href = mainAppUrl || '/';
      return;
    }

    if (queryOrPath.startsWith('/')) {
      window.location.href = `${mainAppUrl}${queryOrPath}`;
      return;
    }

    window.location.href = `${mainAppUrl}?problem=${encodeURIComponent(queryOrPath)}`;
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'glass py-3 border-b border-[#dadce0]/30 shadow-sm' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4285f4] to-[#9b51e0] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl font-bold text-white">S</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#1f1f1f]">Socrates AI</span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-[#5f6368]">
            <a href="#features" className="hover:text-[#4285f4] transition-colors">기능</a>
            <a href="#how-it-works" className="hover:text-[#4285f4] transition-colors">방법</a>
            <a href="#pricing" className="hover:text-[#4285f4] transition-colors">요금제</a>
            <button
              onClick={() => launchApp('')}
              className="px-6 py-2.5 rounded-full bg-[#1f1f1f] text-white hover:bg-black transition-all shadow-md hover:shadow-xl active:scale-95"
            >
              시작하기
            </button>
          </div>

          <button className="md:hidden text-[#1f1f1f]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-40 overflow-hidden px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#4285f4] text-xs font-bold uppercase tracking-widest mb-10 animate-fade-in shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            V2.0 is now live
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] mb-12 text-gradient tracking-tighter">
            Think<br />deeper.
          </h1>
          <p className="max-w-2xl mx-auto text-xl md:text-2xl text-[#5f6368] mb-16 leading-relaxed font-light">
            질문 하나가 당신의 가능성을 발견합니다. <br className="hidden md:block" /> AI가 안내하는 통찰력 있는 사유를 통해 진정한 해답을 찾아보세요.
          </p>

          {/* Floating Input Bar (Gemini Style) */}
          <div className="max-w-3xl mx-auto relative mb-16 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#4285f4] to-[#9b51e0] rounded-3xl blur-xl opacity-0 group-hover:opacity-10 transition duration-1000"></div>
            <div className="relative flex items-center bg-white border border-[#dadce0] rounded-[2rem] p-3 pl-8 shadow-2xl shadow-blue-500/5 transition-all group-focus-within:border-[#4285f4] group-focus-within:ring-4 group-focus-within:ring-blue-500/5">
              <Sparkles className="w-6 h-6 text-[#4285f4] mr-5" />
              <input
                type="text"
                placeholder="어떤 고민이 있으신가요?"
                className="bg-transparent border-none outline-none text-[#1f1f1f] w-full text-xl placeholder:text-[#5f6368]/50"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && launchApp(heroPrompt)}
              />
              <button
                onClick={() => launchApp(heroPrompt)}
                className="p-4 rounded-full bg-[#1f1f1f] text-white hover:bg-black transition-all shadow-lg ml-3 group/btn"
              >
                <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="mt-6 flex justify-center gap-8 text-[11px] uppercase tracking-[0.2em] font-bold text-[#5f6368]/60">
              <span className="flex items-center gap-2">Enter to search</span>
              <span className="flex items-center gap-2">Privacy focused</span>
            </div>
          </div>
        </div>

        {/* Decorative background gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-br from-blue-50/50 via-violet-50/30 to-rose-50/20 rounded-full blur-[140px] -z-10"></div>
        <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] bg-blue-50/40 rounded-full blur-[120px] -z-10"></div>
      </section>

      {/* Product Preview (High Fidelity) */}
      <section id="demo" className="py-24 px-6 bg-[#f8f9fa]/50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.06)] border border-[#dadce0] relative animate-fade-in">
            {/* Browser-like header */}
            <div className="h-14 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center px-8 justify-between">
              <div className="flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0]"></div>
              </div>
              <div className="text-[11px] text-[#5f6368] font-bold tracking-[0.1em] uppercase">Deep Thinking Session</div>
              <div className="w-10"></div>
            </div>

            <div className="p-10 md:p-16 space-y-12">
              {/* User Message */}
              <div className="flex flex-col gap-4 items-end max-w-2xl ml-auto">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#5f6368]">User</span>
                  <div className="w-8 h-8 rounded-full bg-[#1f1f1f] flex items-center justify-center text-white text-[10px] uppercase font-bold">U</div>
                </div>
                <div className="p-6 rounded-3xl rounded-tr-sm bg-[#f1f3f4] text-[#1f1f1f] text-lg shadow-sm">
                  인생의 진정한 목적을 어떻게 찾을 수 있을까요?
                </div>
              </div>

              {/* Socrates Response */}
              <div className="flex flex-col gap-4 items-start max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4285f4] to-[#9b51e0] flex items-center justify-center text-white text-[10px] font-bold">S</div>
                  <span className="text-xs font-semibold text-[#4285f4]">Socrates AI</span>
                </div>
                <div className="p-8 rounded-[2rem] rounded-tl-sm bg-white border border-[#dadce0] text-[#1f1f1f] text-lg leading-relaxed shadow-xl shadow-blue-500/5">
                  <Sparkles className="w-5 h-5 text-[#4285f4] mb-4" />
                  당신의 목적은 어딘가에서 '발견'되기를 기다리고 있는 것일까요, 아니면 당신이 매 순간 내리는 선택들을 통해 '창조'해 나가는 것일까요?
                </div>
              </div>

              {/* Progress Level */}
              <div className="mt-16 pt-10 border-t border-[#f1f3f4] flex flex-col items-center">
                <div className="flex justify-between w-full max-w-md text-[11px] font-bold text-[#5f6368] uppercase tracking-widest mb-4">
                  <span>Surface Inquiry</span>
                  <span className="text-[#4285f4]">Deep Wisdom</span>
                </div>
                <div className="w-full max-w-md h-3 bg-[#f1f3f4] rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-[#4285f4] to-[#9b51e0] w-[72%] rounded-full shadow-lg shadow-blue-500/20"></div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4285f4] animate-pulse"></div>
                  <span className="text-sm font-semibold text-[#1f1f1f]">현재 깊이: 72%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories (Airy Grid) */}
      <section id="categories" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-black text-[#1f1f1f] mb-6 tracking-tight">전문적인 사유 파트너</h2>
              <p className="text-[#5f6368] text-xl leading-relaxed">다양한 학문적 범주에서 비판적 사고의 도구를 사용하여 지적인 확장을 경험해 보세요.</p>
            </div>
            <button onClick={() => launchApp('')} className="flex items-center gap-3 text-[#4285f4] font-bold text-lg hover:gap-5 transition-all group">
              전체 탐구하기 <ArrowRight className="w-6 h-6 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {[
              { icon: <Binary className="w-8 h-8" />, title: "수학·과학", items: ["추론 프로세스", "가설 검증"], color: "#4285f4" },
              { icon: <Code2 className="w-8 h-8" />, title: "코딩", items: ["아키텍처 설계", "로직 비평"], color: "#4285f4" },
              { icon: <Briefcase className="w-8 h-8" />, title: "비즈니스", items: ["전략적 직관", "모델링"], color: "#34a853" },
              { icon: <PenTool className="w-8 h-8" />, title: "창의적 사고", items: ["내러티브", "은유"], color: "#ea4335" },
              { icon: <BarChart3 className="w-8 h-8" />, title: "데이터", items: ["패턴 인식", "인과 관계"], color: "#fbbc05" }
            ].map((cat, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-white border border-[#dadce0] hover:border-[#4285f4] transition-all group card-hover">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[#f8f9fa] flex items-center justify-center mb-8 border border-[#dadce0]/50 group-hover:scale-110 transition-transform">
                  <div style={{ color: cat.color }}>{cat.icon}</div>
                </div>
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-6">{cat.title}</h3>
                <ul className="space-y-4">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-3 text-[#5f6368] text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#dadce0] group-hover:bg-[#4285f4] transition-colors" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features (Modern Minimal) */}
      <section id="features" className="py-32 px-6 bg-[#f8f9fa]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-[#1f1f1f] mb-8 tracking-tight">The Socratic Advantage</h2>
            <p className="text-[#5f6368] text-xl leading-relaxed font-light">우리는 답을 주지 않습니다. 당신이 스스로 최선의 답을 내릴 수 있도록 '질문의 힘'을 제공합니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: <MessageSquare className="w-8 h-8 text-[#4285f4]" />,
                title: "심층적 탐구",
                desc: "단순한 지식을 넘어 문제의 본질을 꿰뚫는 질문을 던집니다."
              },
              {
                icon: <Zap className="w-8 h-8 text-[#4285f4]" />,
                title: "비판적 사고 보호",
                desc: "자신의 논리적 오류를 식별하고 사고의 지평을 넓히세요."
              },
              {
                icon: <Target className="w-8 h-8 text-[#4285f4]" />,
                title: "자기 발견의 여정",
                desc: "이미 당신 안에 존재하던 진실을 올바른 질문을 통해 이끌어냅니다."
              }
            ].map((f, i) => (
              <div key={i} className="group p-12 rounded-[2.5rem] bg-white border border-[#dadce0] transition-all card-hover">
                <div className="w-16 h-16 rounded-2xl bg-[#eff4ff] flex items-center justify-center mb-8 border border-[#d2e3fc]">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold text-[#1f1f1f] mb-5 font-display">{f.title}</h3>
                <p className="text-[#5f6368] text-lg leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing (Premium Cards) */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#f8f9fa] border border-[#dadce0] text-[#5f6368] text-xs font-bold uppercase tracking-widest mb-8">
              Pricing Options
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-[#1f1f1f] mb-8 tracking-tight">사유의 가치를 투자하세요</h2>
            <p className="text-[#5f6368] max-w-2xl mx-auto text-xl font-light">당신의 지적 여정에 가장 적합한 단계를 선택해 보세요.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Basic */}
            <div className="p-10 rounded-[2.5rem] bg-white border border-[#dadce0] flex flex-col card-hover">
              <div className="mb-10">
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-3">Starter</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[#1f1f1f]">₩0</span>
                  <span className="text-[#5f6368] text-lg font-medium">/month</span>
                </div>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {["일일 3회 질문 탐구", "표준 AI 모델 기반", "기본 탐구 기록", "커뮤니티 지원"].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-[#5f6368] text-base font-medium">
                    <CheckCircle2 className="w-6 h-6 text-[#dadce0]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-5 rounded-2xl bg-[#f8f9fa] border border-[#dadce0] text-[#1f1f1f] font-bold hover:bg-[#f1f3f4] transition-all">
                무료로 시작하기
              </button>
            </div>

            {/* Pro */}
            <div className="p-10 rounded-[2.5rem] bg-white border-2 border-[#4285f4] flex flex-col relative scale-105 shadow-[0_40px_80px_-15px_rgba(66,133,244,0.15)] z-10 overflow-hidden">
              <div className="absolute top-0 right-0 px-6 py-2.5 bg-[#4285f4] text-white text-[11px] font-black uppercase tracking-widest rounded-bl-3xl">
                Most Chosen
              </div>
              <div className="mb-10">
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-3">Deep Thinker</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[#1f1f1f]">₩19,000</span>
                  <span className="text-[#5f6368] text-lg font-medium">/month</span>
                </div>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {["제한 없는 질문 탐구", "최고 성능 추론 모델 우선권", "단계별 성장 시각화 리포트", "우선 순위 고객 지원", "광고 없는 환경", "대화 로그 내보내기"].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-[#1f1f1f] text-base font-bold">
                    <CheckCircle2 className="w-6 h-6 text-[#4285f4]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => launchApp('/pricing?action=pay-pro')}
                className="w-full py-5 rounded-2xl bg-[#4285f4] text-white font-bold hover:bg-[#2b7de9] transition-all shadow-xl shadow-blue-500/25"
              >
                멤버십 가입하기
              </button>
            </div>

            {/* Academic */}
            <div className="p-10 rounded-[2.5rem] bg-white border border-[#dadce0] flex flex-col card-hover">
              <div className="mb-10">
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-3">Expert</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[#1f1f1f]">₩49,000</span>
                  <span className="text-[#5f6368] text-lg font-medium">/month</span>
                </div>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {["Pro의 모든 기능 포함", "학술 인용 및 출처 분석", "고급 논리학 기반 분석 도구", "다중 사용자 공동 연구", "API 접근 권한"].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-[#5f6368] text-base font-medium">
                    <CheckCircle2 className="w-6 h-6 text-[#dadce0]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-5 rounded-2xl bg-[#f8f9fa] border border-[#dadce0] text-[#1f1f1f] font-bold hover:bg-[#f1f3f4] transition-all">
                전문가용 문의하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section (Gemini Style Mesh) */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1f1f1f] rounded-[3rem] p-16 md:p-24 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#4285f4]/20 rounded-full blur-[120px] -z-10 group-hover:scale-110 transition-transform duration-[2000ms]"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#9b51e0]/10 rounded-full blur-[100px] -z-10"></div>

            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-medium text-white leading-tight">
                지금 당신의 <span className="italic text-[#4285f4] font-serif">한계를 넘는</span> <br /> 질문을 던지세요.
              </h2>
            </div>

            <div className="w-full lg:w-auto flex-1 max-w-2xl">
              <div className="relative">
                <div className="flex items-center bg-white border border-white/10 rounded-[2rem] p-3 pl-8 shadow-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
                  <input
                    type="text"
                    placeholder="Socrates AI에게 물어보세요"
                    className="bg-transparent border-none outline-none text-[#1f1f1f] w-full text-xl placeholder:text-[#5f6368]/50"
                    value={ctaPrompt}
                    onChange={(e) => setCtaPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && launchApp(ctaPrompt)}
                  />
                  <button
                    onClick={() => launchApp(ctaPrompt)}
                    className="px-8 py-4 rounded-2xl bg-[#1f1f1f] text-white font-bold hover:bg-black transition-all shadow-xl flex items-center gap-3 group/send whitespace-nowrap"
                  >
                    질문 시작
                    <Send className="w-5 h-5 group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Clean & Professional) */}
      <footer className="bg-white border-t border-[#f1f3f4] py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20 text-[#5f6368]">
            {/* Brand column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-[#4285f4] flex items-center justify-center font-bold text-white">S</div>
                <span className="text-xl font-bold text-[#1f1f1f]">Socrates AI</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 font-medium">당신의 사고를 깊이 있게 만드는 <br /> 차세대 AI 통찰 리더십 파트너.</p>
            </div>

            {/* Quick links */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-widest">제품</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-[#4285f4] transition-colors">기능 안내</a></li>
                <li><a href="#" className="hover:text-[#4285f4] transition-colors">적용 카테고리</a></li>
                <li><a href="#" className="hover:text-[#4285f4] transition-colors">실시간 데모</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-widest">회사</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-[#4285f4] transition-colors">뉴이어 회사소개</a></li>
                <li><a href="#" className="hover:text-[#4285f4] transition-colors">프라이버시 정책</a></li>
                <li><a href="#" className="hover:text-[#4285f4] transition-colors">이용 약관</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-widest">문의</h4>
              <p className="text-sm font-medium leading-relaxed">010-9369-5349 <br />cs@newyears.kr</p>
            </div>
          </div>

          <div className="pt-12 border-t border-[#f1f3f4]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
              <div className="flex flex-col gap-4 text-[13px] font-medium text-[#5f6368]">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span className="font-bold text-[#1f1f1f]">뉴이어 (NewYear)</span>
                  <span>대표: 최용호</span>
                  <span>사업자등록번호: 778-27-01716</span>
                </div>
                <p>경기도 부천시 원미구 소향로 223, 1519호</p>
              </div>
              <p className="text-xs text-[#5f6368]/50">ⓒ 2025 뉴이어 (NewYear). All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
