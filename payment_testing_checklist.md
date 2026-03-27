# 결제 테스트 체크리스트

> 수정된 버그 5개 + 웹훅 API 재조회 구조 반영 최종 버전

---

## 사전 확인 (테스트 시작 전)

- [ ] Netlify 환경 변수 세팅 확인
  - `PORTONE_V2_API_SECRET`
  - `VITE_PORTONE_STORE_ID`
  - `VITE_PORTONE_CHANNEL_KEY`
  - `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
  - `SLACK_PAYMENT_ALERT_WEBHOOK_URL`
- [ ] 포트원 관리자 → 웹훅 URL이 `https://{배포URL}/.netlify/functions/webhook` 으로 등록되어 있는가
- [ ] 포트원 관리자 → 수신 이벤트에 `Transaction.Paid`, `Transaction.Failed`, `Schedule.Failed` 체크 여부

---

## 시나리오 1: 결제 성공 (신규 구독)

### 테스트 절차
1. 테스트 카드로 구독 시작 → `subscribe` 함수 호출
2. 포트원이 `Transaction.Paid` 웹훅 발송
3. `webhook` 함수가 `GET /payments/{paymentId}` 로 포트원 API 재조회

### 확인 항목

**Netlify 로그 (`subscribe` 함수)**
- [ ] `Processing subscription for user: {uid}` 로그 출력
- [ ] 포트원 첫 결제 API 응답 200 확인
- [ ] `schedule_` ID로 다음 달 예약 등록 로그 출력

**Netlify 로그 (`webhook` 함수)**
- [ ] `Webhook received:` — payload에 `paymentId`만 있고 `customData`는 없음을 확인 (정상)
- [ ] `GET /payments/{paymentId}` 재조회 후 `status: "PAID"` 확인 로그
- [ ] `다음 달 결제 예약 완료: schedule_...` 로그 출력

**Firestore `users/{uid}/subscription/current`**
- [ ] `status: "active"`
- [ ] `plan: "pro"`
- [ ] `endDate`: 결제일 + 1개월
- [ ] `nextScheduledAt`: endDate와 동일
- [ ] `billingKey`: 값 존재
- [ ] `cardLast4`, `cardBrand`: 카드 정보 저장

**Firestore `users/{uid}/usage/current`**
- [ ] `limit: 200`
- [ ] `count: 0`
- [ ] `resetAt`: endDate와 동일

**Firestore `users/{uid}/payments/{paymentId}`**
- [ ] `status: "paid"`, `amount: 7500` 저장

**Slack `#payment-alert`**
- [ ] `✅ 결제 성공: [이메일] Pro | ₩7,500 | ...` 메시지 수신

---

## 시나리오 2: 구독 해지

### 테스트 절차
1. 설정 → 구독 해지 버튼 클릭 → `cancelSubscription` 함수 호출

### 확인 항목

**Netlify 로그 (`cancelSubscription` 함수)**
- [ ] 포트원 `/schedules-cancel` 호출 로그 확인
- [ ] 포트원 응답 OK 확인 (없는 스케줄이면 에러 로그 — Firestore는 정상 업데이트)

**Firestore `users/{uid}/subscription/current`**
- [ ] `status: "cancelled"` (active → cancelled)
- [ ] `endDate` 기존 값 **그대로 유지** (즉시 만료 아님)
- [ ] `cancelledAt` 타임스탬프 저장

**Firestore `users/{uid}`** (최상위 문서)
- [ ] `subscription.status: "cancelled"` 반영

**앱 UI**
- [ ] 설정 페이지: 구독 상태가 "해지 예정"으로 표시
- [ ] endDate까지는 Pro 기능 정상 이용 가능 (checkIsPro 로직 확인)

**Slack `#payment-alert`**
- [ ] `🚫 구독 취소: [uid: ...]` 메시지 수신 (cancelSubscription에서 직접 발송)

---

## 시나리오 3: 결제 실패

### 테스트 절차
1. 포트원 관리자 → 수동으로 `Transaction.Failed` 또는 `Schedule.Failed` 웹훅 재발송
   (또는 잔액 부족 테스트 카드 사용)

### 확인 항목

**Netlify 로그 (`webhook` 함수)**
- [ ] `GET /payments/{paymentId}` 재조회 로그
- [ ] customerId 추출 성공 로그

**Firestore `users/{uid}/subscription/current`**
- [ ] `status: "inactive"` 로 변경

**Firestore `users/{uid}/usage/current`**
- [ ] `limit: 5` (Free 등급으로 즉시 리셋)
- [ ] `resetAt`: 내일 00:00:00

**앱 UI**
- [ ] 새로고침 후 Pro 기능 차단 확인

**Slack `#payment-alert`**
- [ ] `❌ 결제 실패 (Transaction.Failed): [이메일] | 사유: ...` 메시지 수신
- [ ] 실패 사유가 "알 수 없는 이유"가 아닌 실제 사유로 출력되는지 확인

---

## 시나리오 4: 재구독 (해지 상태 → 기간 중 재구독)

### 전제 조건
- `status: "cancelled"`, `endDate`가 아직 미래

### 테스트 절차
1. 설정 → 재구독 버튼 클릭

### 확인 항목

**Netlify 로그 (`subscribe` 함수)**
- [ ] `Resubscribe detected for user {uid}. Extending from {기존 endDate}` 로그 출력
- [ ] `nextMonth`가 현재 시각이 아닌 **기존 endDate + 1개월**으로 계산됨

**Firestore `users/{uid}/subscription/current`**
- [ ] `status: "active"` 복원
- [ ] `endDate`: 기존 endDate + 1개월 (현재 시각 기준 아님)

**포트원 관리자**
- [ ] 새 스케줄이 기존 endDate + 1개월 시점에 등록됐는지 확인

---

## 시나리오 5: 카드 교체 (데스크톱)

### 테스트 절차
1. 설정 → 카드 변경 버튼 → 새 테스트 카드 입력
2. `updateBillingKey` 함수 호출

### 확인 항목

**Netlify 로그 (`updateBillingKey` 함수)**
- [ ] 기존 스케줄 취소 (`schedules-cancel`) 성공 로그
- [ ] 새 스케줄 등록 (`payments-schedule`) 성공 로그
- [ ] 새 scheduleId가 `schedule_{uid}_{timestamp}_r1` 형태인지 확인 (ID 충돌 방지)

**Firestore `users/{uid}/subscription/current`**
- [ ] `billingKey` 새 값으로 교체
- [ ] `cardLast4`, `cardBrand` 업데이트
- [ ] `cardUpdateCount: 1` 저장

**포트원 관리자**
- [ ] 기존 스케줄 취소 확인
- [ ] 새 스케줄 (`_r1` suffix)이 동일 날짜에 등록 확인

**앱 UI**
- [ ] 카드 정보 표시 업데이트 확인

---

## 시나리오 6: 카드 교체 후 해지 (카드 교체 이력 있을 때)

### 전제 조건
- 카드 교체 1회 완료 (`cardUpdateCount: 1`, 스케줄 ID `_r1`)

### 테스트 절차
1. 설정 → 구독 해지

### 확인 항목

**Netlify 로그 (`cancelSubscription` 함수)**
- [ ] scheduleId가 `schedule_{uid}_{timestamp}_r1` 으로 계산됨 (카드 교체 이력 반영)
- [ ] 포트원 `/schedules-cancel` 호출 시 올바른 ID 전달

**Firestore**
- [ ] `status: "cancelled"`, `endDate` 유지

---

## 시나리오 7: 카드 교체 (모바일)

### 테스트 절차
1. 모바일(또는 DevTools 모바일 에뮬레이션)에서 설정 → 카드 변경
2. 포트원 팝업 → 카드 입력 → 포트원이 `/payment-success?billingKey=...&mode=update-card` 로 리다이렉트

### 확인 항목

**리다이렉트 URL**
- [ ] `mode=update-card` 파라미터가 URL에 포함되어 있는지 확인

**PaymentSuccess.tsx 동작**
- [ ] `mode === 'update-card'` 분기 진입 확인
- [ ] `subscribe`가 아닌 `updateBillingKey` 함수로 요청 전송
- [ ] 성공 시 `/settings`로 리다이렉트

**Netlify 로그 (`updateBillingKey` 함수)**
- [ ] 시나리오 5와 동일 확인 항목

---

## 시나리오 8: 멱등성 (웹훅 중복 수신)

### 테스트 절차
1. 포트원 관리자 → 이미 처리된 `Transaction.Paid` 웹훅 재발송

### 확인 항목

**Netlify 로그 (`webhook` 함수)**
- [ ] `결제 {paymentId} 이미 처리됨. 스킵.` 로그 출력
- [ ] Firestore 중복 업데이트 없음
- [ ] 다음 달 스케줄 중복 등록 없음
- [ ] 응답 `200 OK (Already Processed)` 반환

---

## 보안 검증

- [ ] **위조 웹훅 차단**: 임의의 `Transaction.Paid` payload를 직접 POST → 포트원 API 재조회 결과 `status !== "PAID"` → 처리 거부 확인
- [ ] **customData 없는 결제 처리**: `customData`가 없는 경우 Slack ⚠️ 알림 발송 후 200 반환 확인
- [ ] **billingKey 로그 미노출**: Netlify 로그에 billingKey가 평문으로 찍히지 않음 확인

---

## 웹훅 흐름 최종 확인

```
포트원 → webhook 함수 (paymentId만 있음)
                ↓
    GET /payments/{paymentId}  ← PortOne API 재조회
                ↓
    status === "PAID" 검증
                ↓
    customData(userId) 추출
                ↓
    Firestore 업데이트 + 다음 달 스케줄 등록
```

- [ ] 위 흐름이 Netlify 로그 상에서 순서대로 확인되는가
- [ ] 포트원 관리자 → 웹훅 로그에서 모든 이벤트가 `200 OK` 응답을 받았는가
