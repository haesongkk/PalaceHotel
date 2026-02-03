# 예약내역 스킬 전용 엔드포인트 및 예약 취소 버튼 계획

## 현재 구조

- **단일 스킬**: 모든 카카오 스킬 요청이 `POST /api/kakao/skill` 로 들어옴.
- **예약내역**: `lib/kakao-skill-handler.ts` 에서
  - "예약내역" 발화 시 → 리스트 카드로 전체 예약 목록 표시
  - 리스트 항목 클릭 시 → `extra.reservationId` 로 요청이 오지만, 현재는 "예약내역 눌렀음" 플레이스홀더만 반환

## 목표

1. **예약내역 전용 엔드포인트 분리**: 예약내역 조회/상세/취소 흐름을 별도 API로 분리
2. **예약 항목 클릭 시**: 해당 예약 상세 + **예약 취소** 버튼 노출
3. **예약 취소**: 버튼 클릭 시 예약 상태를 `cancelled_by_guest` 로 변경 후 안내 메시지

---

## 계획

### 1단계: 예약내역 전용 엔드포인트 추가

| 항목 | 내용 |
|------|------|
| **경로** | `POST /api/kakao/skill/reservation-history` |
| **역할** | 예약내역 조회, 예약 상세(취소 버튼 포함), 예약 취소 처리만 담당 |

**요청 분기**

- `utterance === "예약내역"` 이고 `extra.reservationId` 없음  
  → **예약 목록** 응답 (기존 `createHistoryList` 와 동일한 리스트 카드)
- `extra.reservationId` 있음 + `extra.action !== "cancel"`  
  → **해당 예약 상세** 카드 + **예약 취소** 버튼
- `extra.reservationId` 있음 + `extra.action === "cancel"`  
  → 예약 취소 처리 후 **취소 완료** 메시지

---

### 2단계: 예약 상세 카드 (항목 클릭 시)

- **표시 내용**: 객실명, 체크인/체크아웃, 상태, 예약 ID 등 (카카오 카드 제한 내에서)
- **버튼**
  - **예약 취소**:  
    - `action: "message"`, `messageText` 예: `"예약 취소"`,  
    - `extra: { reservationId: "...", action: "cancel" }`  
  - 취소 가능 조건: `status === 'pending' || status === 'confirmed'` 일 때만 노출 (선택 사항: 거절/이미 취소된 예약은 취소 버튼 숨김)

---

### 3단계: 예약 취소 처리

- `dataStore.updateReservation(id, { status: 'cancelled_by_guest' })` 호출
- 필요 시 기존처럼 `sendReservationStatusAlimtalk` 등으로 취소 알림 (선택)
- 응답: `simpleText("예약이 취소되었습니다.")` 또는 챗봇 메시지 설정값 사용

---

### 4단계: 메인 스킬과의 연동

**옵션 A (권장)**  
- 메인 스킬 URL 은 그대로 `POST /api/kakao/skill` 하나만 사용
- 메인 스킬 라우트에서 **예약내역 관련 요청인지 판별**  
  - `utterance === "예약내역"` 또는  
  - `(utterance가 예약내역 조회 관련 메시지) && extra.reservationId`  
  → 이 경우 `POST /api/kakao/skill/reservation-history` 로 전달할 바디를 그대로 넘겨서 **내부에서 reservation-history 라우트 핸들러 호출** (또는 공통 `handleReservationHistorySkill(body)` 사용) 후 그 응답을 그대로 반환
- 카카오 봇 설정 변경 없이, 코드만으로 예약내역 로직을 전용 엔드포인트로 분리

**옵션 B**  
- 카카오 빌더에서 "예약내역" 블록의 스킬 URL 을 `https://도메인/api/kakao/skill/reservation-history` 로 별도 등록
- 메인 스킬에서는 "예약내역" / `extra.reservationId` 분기 제거

---

### 5단계: 공통 처리 정리

- **핸들러 분리**
  - 예약내역 전용: `handleReservationHistorySkill(req)`  
    - `lib/kakao-skill-handler.ts` 에 두거나,  
    - `lib/kakao-skill-reservation-handler.ts` 같은 별도 파일로 분리 후 라우트에서 import
  - `createHistoryList`, `createHistoryItem` 등 예약내역용 함수는 이 핸들러(또는 전용 모듈)에서만 사용하도록 이동/유지
- **메인 스킬**
  - 예약내역 요청이면 `handleReservationHistorySkill(body)` 결과를 반환  
  - 그 외는 기존 `handleKakaoSkillRequest(body)` 로 처리

---

## 파일 변경 요약

| 파일 | 변경 내용 |
|------|-----------|
| `app/api/kakao/skill/reservation-history/route.ts` | **신규** – 예약내역 전용 POST 핸들러 (목록 / 상세+취소버튼 / 취소 처리) |
| `lib/kakao-skill-handler.ts` 또는 `lib/kakao-skill-reservation-handler.ts` | 예약내역 전용 로직 분리: `handleReservationHistorySkill`, 예약 상세 카드 생성, 취소 버튼, 취소 시 `cancelled_by_guest` 처리 |
| `app/api/kakao/skill/route.ts` | 예약내역 요청 여부 판별 후 reservation-history 핸들러 호출(옵션 A) 또는 해당 분기 제거(옵션 B) |

---

## 카카오 응답 형식 참고

- 리스트 카드: 기존 `listCard` (header + items) 유지
- 예약 상세: `basicCard` 또는 `carousel`(단일 항목) 등으로 제목/설명/버튼 구성
- 버튼: `action: "message"`, `messageText`, `extra` 에 `reservationId`, `action: "cancel"` 포함

---

## 체크리스트

- [ ] `POST /api/kakao/skill/reservation-history` 라우트 추가
- [ ] 예약 목록 응답 (기존 리스트 카드 유지)
- [ ] 예약 항목 클릭 시 상세 카드 + "예약 취소" 버튼
- [ ] "예약 취소" 클릭 시 `cancelled_by_guest` 로 업데이트 및 안내 메시지
- [ ] 메인 스킬에서 예약내역 요청 시 reservation-history 핸들러로 위임 (또는 빌더에서 URL 분리)
- [ ] (선택) 취소 시 알림톡 발송

이 순서대로 구현하면 예약내역만 전용 엔드포인트로 빼고, 각 예약 클릭 시 취소 버튼을 붙이는 흐름을 정리할 수 있습니다.
