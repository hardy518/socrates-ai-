import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, Menu, X, CheckCircle2, Send, Shield, TrendingUp } from 'lucide-react';
import './App.css';

const CATEGORIES = [
  {
    id: '수학ㆍ과학',
    label: '수학ㆍ과학',
    example: {
      user: '수열 {aₙ}이 a₁=2, aₙ₊₁ = aₙ + 2n 으로 정의될 때, a₁₀의 값을 구하려고 하는데 어떻게 접근해야 할까요?',
      ai: 'n=1일 때 식을 직접 적용해보면 a₂의 값은 얼마가 되나요? 그 다음 a₃은요? 이 과정을 반복하면서 어떤 패턴이 보이기 시작하나요?'
    }
  },
  {
    id: '코딩',
    label: '코딩',
    example: {
      user: '이 알고리즘이 왜 O(n²)인지 모르겠어요.',
      ai: '이 코드에서 반복 구조를 찾아보면, 어떤 부분이 서로 중첩되어 있나요? 외부 반복이 한 번 실행될 때 내부 반복은 몇 번 실행되나요?'
    }
  },
  {
    id: '비즈니스ㆍ기획',
    label: '비즈니스ㆍ기획',
    example: {
      user: '스타트업 아이디어가 있는데 시장성이 있을지 모르겠어요.',
      ai: '이 아이디어가 해결하려는 문제를, 지금 당장 돈을 내고서라도 해결하고 싶어 하는 사람이 주변에 있나요? 그들이 현재 어떻게 이 문제를 해결하고 있는지 알고 계신가요?'
    }
  },
  {
    id: '글쓰기ㆍ외국어',
    label: '글쓰기ㆍ외국어',
    example: {
      user: '영어 에세이를 쓸 때 논리 전개가 잘 안 됩니다.',
      ai: '이 에세이에서 가장 하고 싶은 말이 딱 하나라면 무엇인가요? 독자가 다 읽고 나서 어떤 생각 하나를 가져가길 바라나요?'
    }
  },
  {
    id: '데이터ㆍ분석',
    label: '데이터ㆍ분석',
    example: {
      user: '상관관계가 높은데 왜 인과관계가 아닐 수 있나요?',
      ai: '두 변수가 함께 움직인다는 것을 확인했군요. 그렇다면 A가 B를 만들어내는 것인지, B가 A를 만들어내는 것인지, 아니면 제3의 원인 C가 둘 다를 만들어내는지를 어떻게 구분할 수 있을까요?'
    }
  },
];

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroPrompt, setHeroPrompt] = useState('');
  const [ctaPrompt, setCtaPrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

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
      <section id="hero" className="relative pt-32 pb-4 md:pt-48 md:pb-6 overflow-hidden px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.95] mb-6 text-gradient tracking-tighter">
            Think<br />deeper.
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg text-[#5f6368] mb-8 leading-relaxed font-light">
            질문 하나로 당신의 가능성을 발견합니다.
          </p>

          {/* Floating Input Bar */}
          <div className="max-w-xl mx-auto relative mb-4 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#4285f4] to-[#9b51e0] rounded-3xl blur-xl opacity-0 group-hover:opacity-10 transition duration-1000"></div>
            <div className="relative flex items-center bg-white border border-[#dadce0] rounded-[2rem] p-2 pl-6 shadow-2xl shadow-blue-500/5 transition-all group-focus-within:border-[#4285f4] group-focus-within:ring-4 group-focus-within:ring-blue-500/5">
              <input
                type="text"
                className="bg-transparent border-none outline-none text-[#1f1f1f] w-full text-base"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && launchApp(heroPrompt)}
              />
              <button
                onClick={() => launchApp(heroPrompt)}
                className="p-3 rounded-full bg-[#1f1f1f] text-white hover:bg-black transition-all shadow-lg ml-2 group/btn flex-shrink-0"
              >
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Quick-select chips */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { emoji: '🔢', label: 'Math' },
              { emoji: '✍️', label: 'Write' },
              { emoji: '</>', label: 'Code' },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => { setHeroPrompt(chip.label + ' '); launchApp(chip.label + ' '); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-[#dadce0] text-[#5f6368] text-sm font-medium hover:border-[#4285f4]/50 hover:text-[#4285f4] transition-all shadow-sm"
              >
                <span className="text-xs">{chip.emoji}</span>
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Decorative background gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-br from-blue-50/50 via-violet-50/30 to-rose-50/20 rounded-full blur-[140px] -z-10"></div>
        <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] bg-blue-50/40 rounded-full blur-[120px] -z-10"></div>
      </section>

      {/* Features — 3 Column Cards (NEW) */}
      <section id="features" className="py-24 px-6 bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8 text-[#4285f4]" />,
                bg: '#eff4ff',
                border: '#d2e3fc',
                title: '단계적 질문',
                desc: '정답을 알려주지 않습니다. 단계별 질문이 당신의 사고를 문제에서 해결책으로 확장시킵니다. 최종 답은 당신 스스로 이끌어냅니다.'
              },
              {
                icon: <Shield className="w-8 h-8 text-[#4285f4]" />,
                bg: '#eff4ff',
                border: '#d2e3fc',
                title: '📸 Snap & Think',
                desc: '문제를 사진으로 찍어 올리세요. AI가 문제를 분석하고, 풀이 방법을 질문으로 안내합니다. 수학 문제부터 코딩 에러까지 모든 문제에 적용 가능합니다.'
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-[#4285f4]" />,
                bg: '#eff4ff',
                border: '#d2e3fc',
                title: '성장 추적',
                desc: '모든 대화가 저장됩니다. 당신의 사고가 어떻게 발전했는지 확인하고, 시간에 따른 추론 깊이를 한눈에 모니터링할 수 있습니다.'
              }
            ].map((f, i) => (
              <div key={i} className="group p-10 rounded-[2rem] bg-white border border-[#dadce0] transition-all card-hover shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-[#4285f4]/30">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border`} style={{ background: f.bg, borderColor: f.border }}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-4">{f.title}</h3>
                <p className="text-[#5f6368] text-base leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep Thinking Session — Segmented Control */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-[#1f1f1f] mb-4 tracking-tight">Deep Thinking Session</h2>
            <p className="text-[#5f6368] text-lg">어떤 주제든 소크라테스처럼 함께 고민합니다</p>
          </div>

          {/* Segmented Control */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(i)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${activeCategory === i
                  ? 'bg-[#4285f4] text-white border-[#4285f4] shadow-lg shadow-blue-500/20'
                  : 'bg-white text-[#5f6368] border-[#dadce0] hover:border-[#4285f4]/50'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Chat Preview */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.06)] border border-[#dadce0]">
            {/* Browser-like header */}
            <div className="h-14 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center px-8">
              <div className="flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0]"></div>
              </div>
            </div>

            <div className="p-10 md:p-14 space-y-10">
              {/* User Message */}
              <div className="flex flex-col gap-3 items-end max-w-2xl ml-auto">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#5f6368]">User</span>
                  <div className="w-8 h-8 rounded-full bg-[#1f1f1f] flex items-center justify-center text-white text-[10px] uppercase font-bold">U</div>
                </div>
                <div className="p-5 rounded-3xl rounded-tr-sm bg-[#f1f3f4] text-[#1f1f1f] text-base shadow-sm">
                  {CATEGORIES[activeCategory].example.user}
                </div>
              </div>

              {/* Socrates Response */}
              <div className="flex flex-col gap-3 items-start max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4285f4] to-[#9b51e0] flex items-center justify-center text-white text-[10px] font-bold">S</div>
                  <span className="text-xs font-semibold text-[#4285f4]">Socrates AI</span>
                </div>
                <div className="p-6 rounded-[2rem] rounded-tl-sm bg-white border border-[#dadce0] text-[#1f1f1f] text-base leading-relaxed shadow-xl shadow-blue-500/5">
                  {CATEGORIES[activeCategory].example.ai}
                </div>
              </div>

              {/* Progress Level */}
              <div className="pt-8 border-t border-[#f1f3f4] flex flex-col items-center">
                <div className="flex justify-between w-full max-w-md text-[11px] font-bold text-[#5f6368] uppercase tracking-widest mb-3">
                  <span>Surface Inquiry</span>
                  <span className="text-[#4285f4]">Deep Wisdom</span>
                </div>
                <div className="w-full max-w-md h-3 bg-[#f1f3f4] rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-[#4285f4] to-[#9b51e0] w-[72%] rounded-full shadow-lg shadow-blue-500/20"></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4285f4] animate-pulse"></div>
                  <span className="text-sm font-semibold text-[#1f1f1f]">현재 깊이: 72%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-6 bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-[#1f1f1f] mb-3 tracking-tight">사유의 가치를 투자하세요</h2>
            <p className="text-[#5f6368] max-w-xl mx-auto text-base font-light">당신의 지적 여정에 가장 적합한 단계를 선택해 보세요.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* Starter */}
            <div className="p-8 rounded-[2rem] bg-white border border-[#dadce0] flex flex-col card-hover">
              <div className="inline-block px-3 py-1 rounded-full bg-[#f1f3f4] text-[#5f6368] text-xs font-bold mb-4">무료</div>
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#1f1f1f]">₩0</span>
                  <span className="text-[#5f6368] text-sm font-medium">/월</span>
                </div>
                <p className="text-[#5f6368] text-sm mt-1">먼저 경험해보세요</p>
              </div>
              <ul className="space-y-3 my-6 flex-1">
                {["하루 5회 대화", "단계별 소크라테스 질문", "대화 영구 저장", "과거 대화 검색"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#5f6368] text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#4285f4] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => launchApp('')}
                className="w-full py-3 rounded-xl bg-white border border-[#dadce0] text-[#1f1f1f] font-bold hover:bg-[#f8f9fa] transition-all text-sm">
                무료로 시작하기
              </button>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-[2rem] bg-white border-2 border-[#4285f4] flex flex-col relative shadow-[0_24px_48px_-8px_rgba(66,133,244,0.18)] z-10">
              <div className="inline-block px-3 py-1 rounded-full bg-[#4285f4] text-white text-xs font-bold mb-4 self-start">추천</div>
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#1f1f1f]">₩7,000</span>
                  <span className="text-[#5f6368] text-sm font-medium">/월</span>
                </div>
                <p className="text-[#5f6368] text-sm mt-1">더 깊이 생각하고 싶을 때</p>
              </div>
              <ul className="space-y-3 my-6 flex-1">
                {["무제한 대화", "단계별 소크라테스 질문", "대화 영구 저장", "과거 대화 검색"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#1f1f1f] text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#4285f4] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => launchApp('/pricing?action=pay-pro')}
                className="w-full py-3 rounded-xl bg-[#4285f4] text-white font-bold hover:bg-[#2b7de9] transition-all shadow-lg shadow-blue-500/25 text-sm"
              >
                Pro로 시작하기
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-[2rem] bg-white border border-[#dadce0] flex flex-col card-hover">
              <div className="inline-block px-3 py-1 rounded-full bg-[#f1f3f4] text-[#5f6368] text-xs font-bold mb-4">기관/기업</div>
              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#1f1f1f]">가격 문의</span>
                </div>
                <p className="text-[#5f6368] text-sm mt-1">조직을 위한 맞춤 솔루션</p>
              </div>
              <ul className="space-y-3 my-6 flex-1">
                {["Pro보다 더 많은 사용량", "Pro의 모든 기능", "관리자 대시보드", "조직 멤버 관리", "데이터 내보내기", "전담 지원"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#5f6368] text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#4285f4] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-white border border-[#dadce0] text-[#1f1f1f] font-bold hover:bg-[#f8f9fa] transition-all text-sm">
                가격 문의하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-[#f8f9fa]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-[#1f1f1f] mb-8 leading-tight tracking-tight">
            지금 당신의 한계를 넘는 질문을 던지세요.
          </h2>
          <div className="max-w-xl mx-auto">
            <div className="flex items-center bg-white border border-[#dadce0] rounded-[1.5rem] p-2 pl-5 shadow-lg hover:shadow-xl hover:border-[#4285f4]/40 focus-within:border-[#4285f4] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <input
                type="text"
                className="bg-transparent border-none outline-none text-[#1f1f1f] w-full text-sm"
                value={ctaPrompt}
                onChange={(e) => setCtaPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && launchApp(ctaPrompt)}
              />
              <button
                onClick={() => launchApp(ctaPrompt)}
                className="px-4 py-2.5 rounded-xl bg-[#4285f4] text-white font-bold hover:bg-[#2b7de9] transition-all shadow-md flex items-center gap-2 whitespace-nowrap text-sm"
              >
                질문 시작
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#f1f3f4] pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Main grid */}
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">

            {/* Left: Brand name only */}
            <div className="flex-shrink-0">
              <span className="text-base font-bold text-[#1f1f1f]">Socrates AI</span>
            </div>

            {/* Right: 3 columns */}
            <div className="flex flex-wrap gap-12 md:gap-20 text-sm">

              {/* 제품 */}
              <div>
                <h4 className="text-xs font-bold text-[#1f1f1f] mb-5 tracking-widest uppercase">제품</h4>
                <ul className="space-y-4 text-[#5f6368]">
                  <li><a href="#features" className="hover:text-[#4285f4] transition-colors">기능 안내</a></li>
                  <li><a href="#demo" className="hover:text-[#4285f4] transition-colors">적용 카테고리</a></li>
                  <li><a href="#hero" className="hover:text-[#4285f4] transition-colors">체험하기</a></li>
                </ul>
              </div>

              {/* 약관 */}
              <div>
                <h4 className="text-xs font-bold text-[#1f1f1f] mb-5 tracking-widest uppercase">약관</h4>
                <ul className="space-y-4 text-[#5f6368]">
                  <li><Link to="/terms-of-service" className="hover:text-[#4285f4] transition-colors">이용약관</Link></li>
                  <li><Link to="/privacy-policy" className="hover:text-[#4285f4] transition-colors">개인정보처리방침</Link></li>
                  <li><Link to="/third-party" className="hover:text-[#4285f4] transition-colors">제3자 제공 안내</Link></li>
                  <li><Link to="/refund-policy" className="hover:text-[#4285f4] transition-colors">취소 및 환불 규정</Link></li>
                </ul>
              </div>


            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#f1f3f4] pt-6">
            <p className="text-xs text-[#9aa0a6] leading-relaxed">
              (주)뉴이어 | 대표: 최용호 | 사업자등록번호: 778-27-01716 | 010-9369-5349 | 경기도 부천시 원미구 소향로 223, 1519호
            </p>
            <p className="text-xs text-[#9aa0a6] mt-1">ⓒ 2025 뉴이어 (NewYear). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
