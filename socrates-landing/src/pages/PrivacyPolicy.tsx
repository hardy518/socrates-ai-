import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
                    <h1 className="text-3xl font-black text-[#1f1f1f] mb-2 tracking-tight">개인정보처리방침</h1>
                    <p className="text-sm text-[#5f6368] mb-1">시행일: 2026년 2월 24일</p>
                    <p className="text-sm text-[#5f6368] mb-10">뉴이어 | 사업자등록번호: 778-27-01716 | 대표자: 최용호</p>

                    <p className="text-[#1f1f1f] leading-relaxed mb-8 text-sm">뉴이어(이하 회사)는 소크라테스 AI 서비스를 제공하면서 사용자의 개인정보보호를 매우 중요하게 생각하며, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「개인정보 보호법」 등 관련 법규를 준수합니다.</p>

                    {[
                        {
                            title: '1. 개인정보 수집 항목 및 목적',
                            content: `회사는 서비스 제공을 위해 필요한 최소한의 개인정보만을 수집합니다.

가. 회원가입 시 (필수)
- 수집 항목: 이메일 주소, 비밀번호, 이름(닉네임), 생년월일
- 수집 목적: 회원 식별, 본인 확인, 만 14세 미만 확인, 서비스 제공 및 고지

나. 서비스 이용 시 (자동 수집)
- 수집 항목: 학습 이력, 질문 및 답변 내용, 접속 로그, OS 종류, 기기 정보, 광고식별정보
- 수집 목적: 서비스 품질 향상, 맞춤형 학습 제공, 유저 분석

다. 결제 시
- 수집 항목: 결제 수단 정보 (카드사명, 승인번호 등)
- 수집 목적: 결제 처리 및 환불
- 결제 정보 수집·처리는 결제대행사에 의해 처리되며, 회사는 원본 카드번호 등 구체적인 결제 수단 정보를 보관하지 않습니다.

라. 고객 문의 시
- 수집 항목: 이름, 이메일, 상담 내역
- 수집 목적: 문의 응대 및 회신`
                        },
                        {
                            title: '2. 개인정보 수집 방법',
                            content: `- 회원가입 페이지를 통한 직접 입력\n- 서비스 이용 과정에서의 자동 수집\n- 고객 문의 접수 시 수집`
                        },
                        {
                            title: '3. 개인정보 보유 및 이용 기간',
                            content: `① 원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 단, 권리남용 방지 및 분쟁 대비를 위해 이용계약 해지일로부터 1년간 보존합니다.

② 관련 법령에 따른 의무 보존 기간:
- 계약·청약철회에 관한 기록: 5년 (전자상거래법)
- 대금 결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)
- 소비자 불만·분쟁 처리에 관한 기록: 3년 (전자상거래법)
- 접속 로그: 3개월 (통신비밀보호법)`
                        },
                        {
                            title: '4. 개인정보 처리 위탁',
                            content: `회사는 서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁합니다.

- Anthropic (Claude AI): AI 대화 서비스 운영
- Google Firebase: 회원 인증 및 데이터베이스 운영
- 아임포트 (코리아포트원): 결제 처리

회사는 위탁계약 시 개인정보보호법 관련 규정을 준수하며, 수탁자가 개인정보를 안전하게 처리하는지 감독합니다.`
                        },
                        {
                            title: '5. 개인정보의 국외 이전',
                            content: `서비스 특성상 일부 개인정보는 국외로 이전될 수 있습니다.

- Google LLC (미국): Firebase 인증·데이터베이스, 서비스 분석
- Anthropic (미국): AI 대화 처리`
                        },
                        {
                            title: '6. 개인정보 제3자 제공',
                            content: `회사는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외입니다.

- 사용자가 사전에 동의한 경우
- 수사 목적으로 관계법령에서 정한 절차에 따라 수사기관이 요구하는 경우
- 통계 작성·학술 연구 등을 위해 특정 개인을 식별할 수 없는 형태로 제공하는 경우`
                        },
                        {
                            title: '7. 개인정보 파기',
                            content: `① 파기절차: 수집 목적이 달성된 후 내부 방침 및 관련 법령에 따라 보관 후 파기합니다.

② 파기방법:
- 전자 파일: 복구 불가능한 기술적 방법으로 삭제
- 종이 문서: 분쇄 또는 소각`
                        },
                        {
                            title: '8. 사용자의 권리',
                            content: `사용자는 언제든지 다음 권리를 행사할 수 있습니다.

- 개인정보 열람 요청
- 오류 정정 요청
- 삭제 요청
- 처리 정지 요청

권리 행사는 아래 개인정보 보호책임자에게 이메일로 신청하시면 지체 없이 조치합니다.`
                        },
                        {
                            title: '9. 개인정보 보호책임자',
                            content: `- 성명: 최용호
- 이메일: darbi0518@gmail.com
- 주소: 경기도 부천시 원미구 소향로 223, 1519호

개인정보 침해 관련 신고·상담은 아래 기관에 문의하실 수 있습니다.
- 개인정보침해신고센터: privacy.kisa.or.kr / 국번 없이 118
- 대검찰청 사이버수사과: spo.go.kr / 국번 없이 1301
- 경찰청 사이버안전국: cyberbureau.police.go.kr / 국번 없이 182`
                        },
                        {
                            title: '10. 개인정보 자동 수집 장치 (쿠키)',
                            content: `① 회사는 서비스 이용 분석을 위해 쿠키를 사용할 수 있습니다.\n② 사용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.`
                        },
                        {
                            title: '11. 개인정보처리방침 변경',
                            content: `본 방침은 법령·정책 변경 등에 따라 개정될 수 있으며, 변경 시 시행일 7일 전부터 홈페이지를 통해 공지합니다.`
                        },
                    ].map((section) => (
                        <section key={section.title} className="mb-10">
                            <h2 className="text-lg font-bold text-[#1f1f1f] mb-4 pb-2 border-b border-[#f1f3f4]">{section.title}</h2>
                            <p className="text-[#374151] leading-relaxed whitespace-pre-line text-sm">{section.content}</p>
                        </section>
                    ))}

                    <div className="mt-12 pt-6 border-t border-[#f1f3f4]">
                        <p className="text-sm text-[#5f6368]">부칙: 이 방침은 2026년 2월 24일부터 시행합니다. (버전 1.0)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
