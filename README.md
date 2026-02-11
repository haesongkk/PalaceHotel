# 호텔 관리자 페이지

호텔 운영을 위한 관리자 대시보드입니다.

## 주요 기능

1. **객실 관리**
   - 객실 목록 조회
   - 객실 추가/수정/삭제
   - 객실 상태 관리 (예약 가능, 사용 중, 점검 중, 예약됨)

2. **예약 관리**
   - 예약 목록 조회
   - 예약 상세 정보 확인
   - 예약 상태 변경 (대기 중, 확인됨, 체크인, 체크아웃, 취소됨)

3. **카카오톡 챗봇 멘트 관리**
   - 챗봇 응답 메시지 추가/수정/삭제
   - 키워드 기반 응답 설정
   - 카테고리별 관리

4. **카카오톡 챗봇 대화 내역 열람**
   - 고객과의 대화 내역 조회
   - 대화 상세 보기

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **데이터 저장**: 메모리 (기본) 또는 PostgreSQL (DATABASE_URL 설정 시)

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### PostgreSQL 사용 (선택)

`.env`에 `DATABASE_URL`이 설정되어 있으면 PostgreSQL을 사용합니다.

1. `.env`에 연결 문자열 추가:
   - 직접 연결: `postgresql://user:password@localhost:5432/palace_hotel`
   - Prisma Postgres: `prisma dev` 실행 후 생성된 `prisma+postgres://...` URL

2. 마이그레이션 적용:
   ```bash
   npm run db:migrate
   ```

3. 시드 데이터 입력:
   ```bash
   npm run db:seed
   ```

4. DB GUI (선택): `npm run db:studio`

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

## 프로젝트 구조

```
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── rooms/             # 객실 관리 페이지
│   ├── reservations/      # 예약 관리 페이지
│   ├── chatbot-messages/  # 챗봇 멘트 관리 페이지
│   ├── chat-histories/    # 대화 내역 페이지
│   └── page.tsx           # 대시보드
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 유틸리티 및 데이터 저장소
├── types/                 # TypeScript 타입 정의
└── public/                # 정적 파일
```

## 카카오톡 챗봇 스킬 API

- **엔드포인트**: `POST /api/kakao/skill`
- 챗봇 관리자센터에서 스킬 URL로 `https://your-domain.com/api/kakao/skill` 를 등록하면 됩니다.
- `action.params.situation`(블록 파라미터) 또는 사용자 발화 키워드로 상황을 판별하고, **카카오톡 챗봇 멘트 관리**에서 설정한 메시지를 그대로 응답합니다.

## 주의사항

- 현재 데이터는 메모리에만 저장되므로 서버를 재시작하면 모든 데이터가 초기화됩니다.
- 프로덕션 환경에서는 실제 데이터베이스를 사용하도록 변경해야 합니다.

