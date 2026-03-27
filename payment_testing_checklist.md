# 포트원 V2 구독 결제 테스트 체크리스트

## 시스템 흐름 전체 구조

```
[사용자 액션]
  Pricing.tsx / Settings.tsx
        │
        ▼
[포트원 JS SDK]
  requestIssueBillingKey() → billingKey 발급
        │
        ▼
[Netlify 함수 호출]
  subscribe.ts          → 초기 결제 + 포트원 스케줄 등록 + Firestore 업데이트
  cancelSubscription.ts → 포트원 스케줄 취소 + Firestore 업데이트
  updateBillingKey.ts   → 포트원 스케줄 재등록 + Firestore 업데이트
        │
        ▼
[포트원 → Netlify webhook.ts]
  Transaction.Paid      → Firestore(구독+사용량+결제이력) 업데이트 + 다음 달 스케줄 등록 + Slack
  Transaction.Failed    → Firestore 상태 inactive + 사용량 limit:5 + Slack
  Schedule.Failed       → 위와 동일
  Subscription.Cancelled/ Transaction.Cancelled → Firestore 상태 cancelled + Slack
  Webhook.Test / BillingKey.Ready → 200 OK만 반환, Firestore 미변경
```

> **Pro 판별 로직** (`checkIsPro`, `Settings.tsx` 내 `isPro` 변수):
> - `status === 'active'` → Pro
> - `status === 'cancelled'` AND `endDate > 현재 시각` → Pro (남은 기간 혜택 유지)
> - `status === 'inactive'` 또는 `endDate` 만료 → Free

---

## 시나리오 1: 첫 구독 — 데스크톱 (웹)

**시작 경로**: `/pricing` 페이지 → Pro 플랜 버튼 클릭

### Step 1. 프론트엔드 — 결제창 호출 전
- [ ] Pro 버튼이 활성화되어 있는가? (이미 `active` 상태면 비활성화 + "구독 중" 텍스트)
- [ ] 버튼 클릭 시 로그인 안 된 상태라면 Google 로그인 팝업이 뜨는가?
- [ ] 로그인된 상태에서 버튼 클릭 시, 클릭 직전 서버에서 **이중으로 Pro 여부를 재확인**하는가?
  - 네트워크 탭: `checkIsPro`, `getSubscription` 호출 확인
  - 이미 `active` 상태면 토스트("이미 Pro 멤버십 구독 중")와 함께 홈으로 이동하는가?

### Step 2. 포트원 결제창 (billingKey 발급)
- [ ] 포트원 카드 등록 팝업이 정상적으로 열리는가?
- [ ] 카드 정보 입력 후 팝업이 닫히고 billingKey가 반환되는가?
  - 브라우저 콘솔에서 `response.billingKey` 확인
- [ ] 카드 등록 취소(팝업 닫기) 시 `response.code`가 반환되고, 에러 토스트가 뜨는가?

### Step 3. `subscribe` 함수 (Netlify)
- [ ] **Netlify Logs**: `200 OK` 반환 확인
- [ ] 로그에서 `Processing subscription for user: {uid}` 확인
- [ ] 초기 결제(₩7,500) 성공 로그 확인 (`paymentId: initial_{uid}_{timestamp}`)
- [ ] 다음 달 예약 결제 등록 성공 로그 확인 (`scheduleId: schedule_{uid}_{timestamp}`)
- [ ] 스케줄 등록 **실패** 시 Slack `⚠️ 스케줄 생성 실패` 알림이 오는가?

### Step 4. Firestore 확인 — `subscribe` 직후
- [ ] `users/{uid}/subscription/current`:
  - [ ] `plan: "pro"`
  - [ ] `status: "active"`
  - [ ] `startDate`: 현재 시각
  - [ ] `endDate`: 정확히 한 달 뒤
  - [ ] `billingKey`: 저장됨 (비어있지 않음)
  - [ ] `nextScheduledAt`: `endDate`와 동일한 값 ← **취소 시 스케줄 ID 생성에 사용, 필수**
  - [ ] `lastPaymentId`: `initial_{uid}_{timestamp}` 형식

### Step 5. Firestore 확인 — webhook `Transaction.Paid` 수신 후
- [ ] `users/{uid}/usage/current`:
  - [ ] `limit: 200`
  - [ ] `count: 0`
  - [ ] `resetAt`: 한 달 뒤
- [ ] `users/{uid}/subscription/current`:
  - [ ] `cardLast4`: 카드 끝 4자리
  - [ ] `cardBrand`: 카드사 이름 (예: VISA, MASTER)
- [ ] `users/{uid}/payments/{paymentId}`:
  - [ ] `status: "paid"`
  - [ ] `amount: 7500`
  - [ ] `cardLast4`, `cardBrand` 저장됨
  - [ ] `paidAt`: 결제 시각

### Step 6. 포트원 콘솔 확인
- [ ] 결제 내역에서 ₩7,500 결제 성공 확인
- [ ] `payments-schedule`에 다음 달 예약 결제 등록 확인

### Step 7. Slack
- [ ] `#payment-alert` 채널에 `✅ 결제 성공` 메시지 도착 (webhook 경유)
  - 메시지에 이메일, 금액, 결제 시각 포함 여부 확인

### Step 8. 프론트엔드 — 결제 완료 후
- [ ] 성공 토스트 메시지("구독이 시작되었습니다") 표시
- [ ] 2초 후 홈(`/`) 으로 자동 이동
- [ ] 홈에서 Pro 기능(사용량 200 표시 등)이 즉시 반영되는가?

---

## 시나리오 2: 첫 구독 — 모바일 (리다이렉트)

**시작 경로**: 모바일 브라우저 `/pricing` → Pro 버튼 클릭

### Step 1~2. 결제창 호출
- [ ] 포트원이 모바일 전용 페이지로 이동하는가?
- [ ] 결제 완료 후 `/payment-success?billingKey=...` 로 리다이렉트되는가?

### Step 3. `PaymentSuccess.tsx` 처리
- [ ] URL에서 `billingKey` 파라미터가 감지되는가?
- [ ] 즉시 URL에서 billingKey가 제거되는가? (브라우저 주소창 확인 — 보안)
- [ ] `subscribe` 함수 호출 후 성공 토스트 표시
- [ ] 성공 시 2초 후 홈(`/`)으로 이동

### Step 4~8. Firestore, 포트원 콘솔, Slack
- 데스크톱 시나리오 Step 4~8과 동일하게 확인

---

## 시나리오 3: 초기 결제 실패 (카드 등록 후 첫 결제 실패)

**사전 준비**: 포트원 테스트 모드에서 실패용 카드 번호 사용

- [ ] `subscribe` 함수에서 `400 Bad Request` 반환 (`"첫 결제 실패"` 메시지)
- [ ] 프론트엔드: 에러 토스트 표시 (`"결제 처리 중 오류가 발생했습니다"`)
- [ ] Firestore `subscription/current` 문서가 **생성되지 않았는가**? (반쪽 상태 없음 확인)
- [ ] Firestore `usage/current`가 변경되지 않았는가?

---

## 시나리오 4: 정기 결제 실패 (Schedule.Failed / Transaction.Failed)

**사전 준비**: 포트원 관리자 콘솔에서 `Schedule.Failed` 웹훅 수동 발송

- [ ] **Netlify Logs**: `webhook` 함수가 `200 OK` 반환
- [ ] 로그에서 `customerId`가 정상적으로 추출되었는가? (`data.customData` 경로)
- [ ] **Firestore** `users/{uid}/subscription/current`:
  - [ ] `status: "inactive"`
  - [ ] 나머지 필드(plan, endDate 등)는 그대로 유지되는가?
- [ ] **Firestore** `users/{uid}/usage/current`:
  - [ ] `limit: 5` (Free 등급)
  - [ ] `count: 0`으로 초기화
  - [ ] `resetAt`: 내일 0시
- [ ] **Slack**: `❌ 결제 실패 (Schedule.Failed)` 메시지 도착, 실패 사유 포함
- [ ] 프론트엔드: 홈 접속 시 Pro 기능이 즉시 차단되는가? (사용량 limit이 5로 표시)

---

## 시나리오 5: 구독 취소

**시작 경로**: 설정(`/settings`) → 구독 탭 → "구독 해지" 버튼

### Step 1. 프론트엔드 — 취소 확인
- [ ] "구독 해지" 버튼 클릭 시 확인 AlertDialog가 뜨는가?
- [ ] 취소 버튼으로 다이얼로그를 닫으면 아무 변화가 없는가?
- [ ] 확인 버튼으로 취소 진행 시 `cancelSubscription` 함수 호출

### Step 2. `cancelSubscription` 함수 (Netlify)
- [ ] **Netlify Logs**: `200 OK` 반환
- [ ] 포트원 `/schedules-cancel` 호출 로그 확인 (`scheduleId: schedule_{uid}_{timestamp}`)
- [ ] **포트원 콘솔**: 해당 스케줄이 `cancelled` 상태로 변경되었는가?

### Step 3. Firestore 확인
- [ ] `users/{uid}/subscription/current`:
  - [ ] `status: "cancelled"`
  - [ ] `endDate`: **변경되지 않고 유지** ← 핵심 (남은 기간 Pro 혜택 보장)
  - [ ] `cancelledAt`: 취소 시각 저장됨
  - [ ] `plan: "pro"`: 유지
- [ ] `users/{uid}` (최상위 문서):
  - [ ] `subscription.status: "cancelled"`
  - [ ] `subscription.cancelledAt`: 취소 시각
- [ ] `users/{uid}/usage/current`: **변경 없음** (limit은 endDate까지 200 유지)

### Step 4. 프론트엔드 — 취소 후
- [ ] 성공 토스트("구독이 취소됐어요") 표시
- [ ] 설정 페이지에서 구독 상태가 "취소됨"으로 표시 (endDate는 여전히 표시)
- [ ] 홈에서 Pro 기능이 **아직 유지**되는가? (endDate가 남았으므로)
  - `isPro` 계산: `status === 'cancelled' && endDate > now` → true

### Step 5. Slack
- [ ] `🚫 구독 취소` 메시지 도착 여부 확인
  - **주의**: `cancelSubscription.ts`는 Slack을 직접 보내지 않음
  - 포트원이 `Subscription.Cancelled` 웹훅을 자동 발송할 때만 Slack이 옴
  - Slack이 오지 않더라도 기능 취소 자체는 정상 동작

---

## 시나리오 6: 재구독 (cancelled 상태에서 endDate 이전)

**시작 경로**: 설정 페이지 → "다시 구독하기" 버튼 (또는 `/pricing` → Pro 버튼)

- [ ] `cancelled` 상태이면서 `endDate`가 남은 사용자에게 재구독 버튼이 표시되는가?
- [ ] 포트원 결제창에서 새 카드 등록 후 `subscribe` 함수 호출
- [ ] **Netlify Logs**: 재구독 감지 로그 확인
  - `"Resubscribe detected for user {uid}. Extending from {existingEndDate}"`
- [ ] **Firestore** `users/{uid}/subscription/current`:
  - [ ] `endDate`: 기존 endDate가 아닌, **기존 endDate에서 +1개월**로 설정되는가?
  - [ ] `status: "active"`
- [ ] 포트원 콘솔: 새 스케줄이 **기존 endDate + 1개월** 시점으로 등록되어 있는가?

---

## 시나리오 7: 정기 결제 자동 갱신 — 웹훅 수동 테스트

**방법**: 포트원 관리자 콘솔 → 웹훅 테스트 → `Transaction.Paid` 이벤트 강제 발송

### Step 1. 웹훅 처리
- [ ] **Netlify Logs**: `webhook` 함수 `200 OK` 반환
- [ ] `customerId`가 `data.customData`에서 올바르게 추출되는가?

### Step 2. 멱등성 확인 ← 반드시 테스트
- [ ] 동일 `paymentId`로 웹훅을 **두 번** 보냈을 때:
  - [ ] 두 번째는 `200 OK (Already Processed)` 반환
  - [ ] Firestore가 중복 업데이트되지 않음
  - [ ] `users/{uid}/payments/{paymentId}` 문서가 중복 생성되지 않음

### Step 3. Firestore 확인
- [ ] `users/{uid}/subscription/current`:
  - [ ] `endDate`: **한 달 더 연장** (웹훅의 `paidAt` 기준 +1개월)
  - [ ] `nextScheduledAt`: 갱신된 endDate와 동일
  - [ ] `status: "active"` 유지
- [ ] `users/{uid}/usage/current`:
  - [ ] `limit: 200`, `count: 0` 리셋
  - [ ] `resetAt`: 새 endDate
- [ ] `users/{uid}/payments/{paymentId}`:
  - [ ] 새 결제 이력 문서 추가됨

### Step 4. 포트원 콘솔
- [ ] 갱신된 endDate 시점으로 **다음 달 스케줄**이 새로 등록되어 있는가? (연쇄 스케줄링)

### Step 5. Slack
- [ ] `✅ 결제 성공` 메시지 도착, 이메일·금액·시각 포함 여부 확인

---

## 시나리오 8: 카드 교체 (수정 완료)

**시작 경로**: 설정 → 구독 탭 → "결제 수단 변경" 버튼

> **수정 내역**: 기존에는 Firestore만 바꾸고 포트원 스케줄은 구 카드 그대로였으나,
> `updateBillingKey.ts` 수정으로 기존 스케줄 취소 → 새 빌링키로 재등록하도록 변경.

### Step 1. 프론트엔드 — 새 카드 등록
- [ ] "결제 수단 변경" 버튼 클릭 시 포트원 카드 등록 팝업이 뜨는가?
- [ ] 새 카드 정보 입력 후 팝업이 닫히고 billingKey가 반환되는가?
- [ ] 팝업 취소 시 에러 토스트 표시 여부 확인

### Step 2. `updateBillingKey` 함수 (Netlify)
- [ ] **Netlify Logs**: `200 OK` 반환
- [ ] 기존 스케줄 취소 로그 확인: `"Cancelled old schedule: schedule_{uid}_{timestamp}"`
- [ ] 새 스케줄 등록 로그 확인: `"Re-created schedule with new billing key: schedule_{uid}_{timestamp}"`

### Step 3. 포트원 콘솔
- [ ] 기존 스케줄이 `cancelled` 상태로 변경되었는가?
- [ ] **동일한 날짜**에 새 빌링키로 신규 스케줄이 등록되었는가?
- [ ] 새 스케줄의 billingKey가 방금 등록한 새 카드의 것인가?

### Step 4. Firestore 확인
- [ ] `users/{uid}/subscription/current`:
  - [ ] `billingKey`: 새 빌링키로 업데이트
  - [ ] `cardLast4`: 새 카드 끝 4자리
  - [ ] `cardBrand`: 새 카드사
  - [ ] `endDate`, `nextScheduledAt`: **변경 없음**

### Step 5. 프론트엔드 — 교체 후
- [ ] 성공 토스트("카드가 변경되었습니다") 표시
- [ ] 설정 페이지에서 카드 정보가 새 카드로 즉시 갱신되는가? (화면 새로고침 없이)

---

## 시나리오 9: 회원 탈퇴

**시작 경로**: 설정 → 하단 "회원 탈퇴" 버튼

### Case A. `active` 구독이 있는 상태에서 탈퇴 시도
- [ ] 탈퇴 확인 다이얼로그에서 진행 시, 에러 토스트("구독을 먼저 해지해주세요") 표시
- [ ] Firestore 및 Firebase Auth 계정이 **삭제되지 않음**

### Case B. 구독 없는 상태 (또는 cancelled 이후)에서 탈퇴
- [ ] 탈퇴 확인 다이얼로그 표시
- [ ] 진행 시 아래 순서로 Firestore 삭제:
  - [ ] `conversations` 컬렉션에서 해당 userId의 문서들이 anonymized (`userId: null`)
  - [ ] `users/{uid}/subscription/current` 삭제
  - [ ] `users/{uid}/usage/current` 삭제
  - [ ] `users/{uid}` 문서 삭제
- [ ] Firebase Auth 계정 삭제
- [ ] 재인증이 필요한 경우(auth/requires-recent-login) Google 재로그인 팝업이 뜨는가?
- [ ] 탈퇴 완료 후 홈(`/`)으로 이동하는가?

---

## 시나리오 10: 예외 및 엣지 케이스

### 중복 구독 시도
- [ ] `active` 상태인 사용자가 `/pricing` Pro 버튼 클릭 시:
  - [ ] **프론트**: 클릭 전 로컬 상태로 1차 차단 (버튼 비활성화)
  - [ ] **프론트**: 버튼 활성화되어 있더라도 클릭 직전 서버 재확인으로 2차 차단 → 토스트 표시
  - [ ] **서버**: 만약 `subscribe` 함수까지 도달 시 `400 Bad Request` + "이미 Pro 멤버십을 구독 중" 반환

### 취소 불가 케이스
- [ ] `active` 상태가 아닌 사용자가 취소 시도 시 → `cancelSubscription` 함수에서 `400 Bad Request` 반환
  - 프론트에서 이 케이스가 막혀있는지 확인 (취소 버튼 자체가 보이지 않는지)

### Webhook.Test / BillingKey.Ready
- [ ] 포트원 관리자 콘솔에서 테스트 웹훅 발송 시:
  - [ ] `200 OK` 반환
  - [ ] Firestore 변경 없음
  - [ ] Slack 알림 없음

### `?action=pay-pro` 쿼리 파라미터 (랜딩 페이지 → 자동 결제 트리거)
- [ ] 랜딩 페이지에서 Pro 시작 버튼 클릭 시 `/pricing?action=pay-pro`로 이동하는가?
- [ ] 페이지 로딩 완료 후 자동으로 포트원 결제창이 열리는가?
- [ ] 이미 Pro 상태인 경우 자동 결제창 없이 홈으로 이동하는가?
