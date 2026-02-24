import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ThirdParty() {
    const navigate = useNavigate();
    useEffect(() => { window.scrollTo(0, 0); }, []);
    return (
        <div className="min-h-screen bg-white font-sans">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[#5f6368] hover:text-[#1f1f1f] transition-colors mb-10 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    뒤로가기
                </button>

                <div>
                    <h1 className="text-3xl font-black text-[#1f1f1f] mb-2 tracking-tight">개인정보 제3자 제공 안내</h1>
                    <p className="text-sm text-[#5f6368] mb-1">시행일: 2026년 2월 24일</p>
                    <p className="text-sm text-[#5f6368] mb-10">뉴이어 | 사업자등록번호: 778-27-01716 | 대표자: 최용호</p>

                    <p className="text-[#1f1f1f] leading-relaxed mb-8 text-sm">뉴이어는 서비스 운영에 필요한 범위 내에서 아래와 같이 개인정보를 제3자에게 제공합니다. 이용자는 회원가입 및 결제 시 동의 절차를 통해 아래 내용에 동의하게 됩니다.</p>

                    {[
                        {
                            title: '1. 제공받는 자 및 제공 목적',
                            content: `가. Anthropic (Claude AI 운영사, 미국)
- 제공 목적: AI 기반 학습 지원 서비스 제공 (소크라테스 모드, 직접 답변 모드)
- 제공 항목: 대화 내용(학습 질문 및 답변), 세션 정보
- 보유 기간: 서비스 제공 기간 / Anthropic 데이터 보존 정책에 따름

나. 결제대행사 (아임포트/PG사)
- 제공 목적: 결제 처리 및 환불
- 제공 항목: 이름, 이메일, 결제 관련 정보
- 보유 기간: 전자상거래법에 따라 5년`
                        },
                        {
                            title: '2. 동의 거부 및 불이익 안내',
                            content: `이용자는 개인정보 제3자 제공에 대한 동의를 거부할 권리가 있습니다.

다만, 위 제공은 서비스의 핵심 기능 운영에 필수적이므로, 동의를 거부하시는 경우 AI 대화 서비스 및 유료 구독 서비스 이용이 불가합니다.`
                        },
                        {
                            title: '3. 문의',
                            content: `- 이메일: darbi0518@gmail.com\n- 담당자: 최용호`
                        },
                    ].map((section) => (
                        <section key={section.title} className="mb-10">
                            <h2 className="text-lg font-bold text-[#1f1f1f] mb-4 pb-2 border-b border-[#f1f3f4]">{section.title}</h2>
                            <p className="text-[#374151] leading-relaxed whitespace-pre-line text-sm">{section.content}</p>
                        </section>
                    ))}

                    <div className="mt-12 pt-6 border-t border-[#f1f3f4]">
                        <p className="text-sm text-[#5f6368]">본 안내는 2026년 2월 24일부터 적용됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
