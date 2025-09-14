-- Supabase 데이터베이스 테이블 생성 스크립트
-- myproject 시설 예약 시스템

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 예약 테이블
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  facility VARCHAR(50) NOT NULL,
  facility_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time_slots TEXT[] NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_reservations_facility_date ON reservations(facility, date);
CREATE INDEX IF NOT EXISTS idx_reservations_username ON reservations(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Row Level Security (RLS) 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (선택사항 - API에서 service role key 사용 시 필요하지 않음)
-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id::uuid);

-- 예약은 모든 사용자가 조회 가능, 자신의 예약만 수정/삭제
CREATE POLICY IF NOT EXISTS "Anyone can view reservations" ON reservations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Users can create reservations" ON reservations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update own reservations" ON reservations
  FOR UPDATE TO authenticated USING (username = current_user);

CREATE POLICY IF NOT EXISTS "Users can delete own reservations" ON reservations
  FOR DELETE TO authenticated USING (username = current_user);