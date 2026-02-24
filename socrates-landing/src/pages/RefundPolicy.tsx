import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicy() {
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
                    <h1 className="text-3xl font-black text-[#1f1f1f] mb-2 tracking-tight">취소 및 환불 규정</h1>
                    <p className="text-sm text-[#5f6368] mb-1">시행일: 2026년 2월 24일</p>
                    <p className="text-sm text-[#5f6368] mb-10">뉴이어 | 사업자등록번호: 778-27-01716 | 대표자: 최용호</p>

                    <p className="text-[#1f1f1f] leading-relaxed mb-8 text-sm">소크라테스 AI(이하 서비스)의 구독 취소 및 환불은 아래 규정에 따라 처리됩니다. 본 규정은 「전자상거래 등에서의 소비자 보호에 관한 법률」 및 관련 법령에 근거합니다.</p>

                    {[
                        {
                            title: '제1조 (구독 취소)',
                            content: `① 이용자는 언제든지 구독을 취소할 수 있습니다.
② 취소는 서비스 내 [마이페이지 > 구독 관리] 또는 고객센터 이메일(darbi0518@gmail.com)을 통해 신청할 수 있습니다.
③ 취소 신청 즉시 다음 결제일부터 자동 결제가 중단됩니다.
④ 구독 취소 후에도 해당 결제 기간의 잔여 기간 동안 서비스를 계속 이용할 수 있습니다.`
                        },
                        {
                            title: '제2조 (환불 기준)',
                            content: `가. 14일 이내 미이용 청약철회
유료 서비스를 이용하지 않고 구매일로부터 14일 이내에 청약철회를 신청하는 경우 전액 환불합니다.

나. 서비스 이용 후 또는 14일 초과 시
환불금액 = (결제금액 - 일일정가 × 사용일수) × 0.9
- 일일정가 = 월정가 ÷ 30
- 취소수수료 10% 공제 후 환불

예시: 월 10,000원 구독, 10일 이용 후 취소 시
→ 일일정가 = 10,000 ÷ 30 = 약 333원
→ 환불금액 = (10,000 - 333 × 10) × 0.9 = (10,000 - 3,330) × 0.9 = 약 6,003원`
                        },
                        {
                            title: '제3조 (환불 제한 사유)',
                            content: `다음의 경우 환불이 제한됩니다.

- 이용자의 약관 위반으로 서비스 이용이 제한된 경우
- 프로모션·무료 체험 등으로 무상 제공된 서비스`
                        },
                        {
                            title: '제4조 (회사 귀책 사유 시 보상)',
                            content: `회사의 고의 또는 중과실로 유료 서비스 정상 이용이 불가한 경우, 이용자 요청 시 이용 불가 기간에 상당하는 금액을 보상합니다.`
                        },
                        {
                            title: '제5조 (청약철회 특례)',
                            content: `① 디지털 콘텐츠의 특성상 서비스를 실제 이용한 경우 전자상거래법 제17조에 따른 청약철회가 제한될 수 있습니다.
② 서비스 내용이 표시·광고와 다르거나 계약 내용과 다르게 이행된 경우, 이용 후 3개월 이내 또는 그 사실을 안 날부터 30일 이내에 청약철회를 할 수 있습니다.`
                        },
                        {
                            title: '제6조 (환불 처리 절차)',
                            content: `① 환불 신청: darbi0518@gmail.com으로 이메일 접수
② 처리 기간: 신청 확인 후 영업일 기준 3~5일 이내
③ 환불 방법: 결제한 수단과 동일하게 환불
④ 동일 수단 환불이 불가한 경우 이용자와 협의하여 처리`
                        },
                        {
                            title: '제7조 (고객센터)',
                            content: `- 이메일: darbi0518@gmail.com
- 담당자: 최용호
- 운영시간: 평일 10:00 ~ 18:00 (공휴일 제외)
- 주소: 경기도 부천시 원미구 소향로 223, 1519호`
                        },
                    ].map((section) => (
                        <section key={section.title} className="mb-10">
                            <h2 className="text-lg font-bold text-[#1f1f1f] mb-4 pb-2 border-b border-[#f1f3f4]">{section.title}</h2>
                            <p className="text-[#374151] leading-relaxed whitespace-pre-line text-sm">{section.content}</p>
                        </section>
                    ))}

                    <div className="mt-12 pt-6 border-t border-[#f1f3f4]">
                        <p className="text-sm text-[#5f6368]">부칙: 이 규정은 2026년 2월 24일부터 시행합니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
