# 시설 예약 시스템

도서관, 멀티미디어실, 동아리실 예약을 관리하는 웹 애플리케이션입니다.

## 설치 및 실행

### 1. Node.js 설치
Node.js가 설치되어 있지 않다면 [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드하여 설치하세요.

### 2. 의존성 패키지 설치
```bash
npm install
```

### 3. 서버 실행
```bash
npm start
```

또는 개발 모드로 실행 (파일 변경 시 자동 재시작):
```bash
npm run dev
```

### 4. 브라우저에서 접속
http://localhost:3000 으로 접속하세요.

## 기본 계정 정보

### 관리자 계정
- 아이디: `admin`
- 비밀번호: `admin123`

### 일반 사용자 계정
- 아이디: `user1` / 비밀번호: `user123` (사용자1)
- 아이디: `user2` / 비밀번호: `user123` (사용자2)
- 아이디: `user3` / 비밀번호: `user123` (김철수)
- 아이디: `user4` / 비밀번호: `user123` (이영희)

## 주요 기능

### 사용자 기능
- 시설별 예약 (도서관, 멀티미디어실, 동아리실1, 동아리실2)
- 날짜별 시간대 선택 (09:00-18:00, 1시간 단위)
- 다중 시간대 예약 가능
- 예약된 시간대에 예약자 이름 표시

### 관리자 기능
- 모든 예약 현황 조회
- 예약 취소
- 사용자별 예약 통계 확인

## 데이터 저장

예약 정보와 사용자 정보는 `data/` 폴더의 JSON 파일에 저장됩니다:
- `data/reservations.json`: 예약 정보
- `data/users.json`: 사용자 정보

## 프로젝트 구조

```
├── server.js          # Express 서버
├── index.html         # 메인 HTML
├── style.css          # 스타일시트
├── app.js            # 클라이언트 JavaScript
├── package.json      # 패키지 설정
├── data/             # 데이터 저장 폴더
│   ├── users.json
│   └── reservations.json
└── README.md         # 프로젝트 설명
```