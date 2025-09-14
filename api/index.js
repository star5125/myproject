// Supabase 클라이언트 설정
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://beggqjgxqotthwsvrffu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZ2dxamd4cW90dGh3c3ZyZmZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyMzM0MSwiZXhwIjoyMDczMzk5MzQxfQ.dwQqOZoK7CpBDIbcjjkSf6zuc-GjU5SZ-n95PT0DmWU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 초기 관리자 계정 생성 함수
async function createInitialAdmin() {
    try {
        const { data: existingAdmin } = await supabase
            .from('users')
            .select('username')
            .eq('username', 'admin')
            .single();

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await supabase
                .from('users')
                .insert([
                    { username: 'admin', password: hashedPassword, role: 'admin', name: '관리자' }
                ]);
            console.log('Initial admin account created');
        }
    } catch (error) {
        console.error('Error creating initial admin:', error);
    }
}

// 서버 시작 시 초기 관리자 계정 생성
createInitialAdmin();

const facilities = {
    library: { name: '도서관', capacity: 50 },
    multimedia: { name: '멀티미디어실', capacity: 30 },
    club1: { name: '동아리실1', capacity: 20 },
    club2: { name: '동아리실2', capacity: 20 }
};

// CORS 헤더 설정 함수
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 메인 핸들러 함수
module.exports = async (req, res) => {
    setCorsHeaders(res);

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Body 파싱 (Vercel에서는 수동으로 처리 필요)
    if (req.method === 'POST' || req.method === 'PUT') {
        if (!req.body && req.body !== '') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            await new Promise(resolve => {
                req.on('end', () => {
                    try {
                        req.body = body ? JSON.parse(body) : {};
                    } catch (e) {
                        req.body = {};
                    }
                    resolve();
                });
            });
        }
    }

    const { method, url } = req;
    const urlPath = url.replace('/api', '').split('?')[0]; // 쿼리 파라미터 제거

    console.log('Request method:', method);
    console.log('Original URL:', url);
    console.log('Parsed URL path:', urlPath);

    try {
        // 로그인 API
        if (method === 'POST' && urlPath === '/login') {
            const { username, password } = req.body;

            try {
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (error || !user) {
                    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
                }

                const isValidPassword = await bcrypt.compare(password, user.password);
                if (isValidPassword) {
                    const { password: _, ...userInfo } = user;
                    return res.json({ success: true, user: userInfo });
                } else {
                    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
                }
            } catch (error) {
                console.error('Login error:', error);
                return res.status(500).json({ success: false, message: '로그인 중 오류가 발생했습니다.' });
            }
        }

        // 회원가입 API
        if (method === 'POST' && urlPath === '/register') {
            const { username, name, password } = req.body;

            if (!username || !name || !password) {
                return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
            }

            if (password.length < 6) {
                return res.status(400).json({ success: false, message: '비밀번호는 6자리 이상이어야 합니다.' });
            }

            try {
                // 기존 사용자 확인
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('username')
                    .eq('username', username)
                    .single();

                if (existingUser) {
                    return res.status(409).json({ success: false, message: '이미 존재하는 사용자명입니다.' });
                }

                // 비밀번호 해시화
                const hashedPassword = await bcrypt.hash(password, 10);

                // 새 사용자 생성
                const { data: newUser, error } = await supabase
                    .from('users')
                    .insert([
                        {
                            username,
                            name,
                            password: hashedPassword,
                            role: 'user'
                        }
                    ])
                    .select()
                    .single();

                if (error) {
                    console.error('Registration error:', error);
                    return res.status(500).json({ success: false, message: '회원가입 중 오류가 발생했습니다.' });
                }

                const { password: _, ...userInfo } = newUser;
                return res.json({ success: true, user: userInfo, message: '회원가입이 완료되었습니다.' });

            } catch (error) {
                console.error('Registration error:', error);
                return res.status(500).json({ success: false, message: '회원가입 중 오류가 발생했습니다.' });
            }
        }

        // 시설 정보 API
        if (method === 'GET' && urlPath === '/facilities') {
            return res.json(facilities);
        }

        // 예약 조회 API
        if (method === 'GET' && urlPath === '/reservations') {
            try {
                const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
                const facility = query.get('facility');
                const date = query.get('date');
                const userOnly = query.get('userOnly');
                const username = query.get('username');

                let supabaseQuery = supabase.from('reservations').select('*');

                if (facility) {
                    supabaseQuery = supabaseQuery.eq('facility', facility);
                }

                if (date) {
                    supabaseQuery = supabaseQuery.eq('date', date);
                }

                if (userOnly === 'true' && username) {
                    supabaseQuery = supabaseQuery.eq('username', username);
                }

                const { data: reservations, error } = await supabaseQuery;

                if (error) {
                    console.error('Reservations query error:', error);
                    return res.status(500).json({ success: false, message: 'Failed to load reservations', error: error.message });
                }

                res.status(200).json(reservations || []);
                return;
            } catch (error) {
                console.error('Reservations API error:', error);
                res.status(500).json({ success: false, message: 'Failed to load reservations', error: error.message });
                return;
            }
        }

        // 예약 생성 API
        if (method === 'POST' && urlPath === '/reservations') {
            const { user, userName, facility, facilityName, date, timeSlots, description } = req.body;

            if (!user || !facility || !date || !timeSlots || timeSlots.length === 0) {
                return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
            }

            try {
                // 중복 예약 확인
                const { data: existingReservations } = await supabase
                    .from('reservations')
                    .select('time_slots')
                    .eq('facility', facility)
                    .eq('date', date);

                const conflictSlots = timeSlots.filter(slot => {
                    return existingReservations?.some(r =>
                        r.time_slots && r.time_slots.includes(slot)
                    );
                });

                if (conflictSlots.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: '이미 예약된 시간대가 포함되어 있습니다.',
                        conflictSlots
                    });
                }

                // 새 예약 생성
                const { data: reservation, error } = await supabase
                    .from('reservations')
                    .insert([
                        {
                            username: user,
                            user_name: userName,
                            facility,
                            facility_name: facilityName,
                            date,
                            time_slots: timeSlots,
                            description: description || ''
                        }
                    ])
                    .select()
                    .single();

                if (error) {
                    console.error('Reservation creation error:', error);
                    return res.status(500).json({ success: false, message: '예약 생성 중 오류가 발생했습니다.' });
                }

                return res.json({ success: true, reservation });

            } catch (error) {
                console.error('Reservation creation error:', error);
                return res.status(500).json({ success: false, message: '예약 생성 중 오류가 발생했습니다.' });
            }
        }

        // 예약 삭제 API
        if (method === 'DELETE' && urlPath.startsWith('/reservations/')) {
            const reservationId = parseInt(urlPath.split('/')[2]);
            const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
            const username = query.get('username');
            const role = query.get('role');

            try {
                // 예약 조회
                const { data: reservation, error: findError } = await supabase
                    .from('reservations')
                    .select('*')
                    .eq('id', reservationId)
                    .single();

                if (findError || !reservation) {
                    return res.status(404).json({ success: false, message: '예약을 찾을 수 없습니다.' });
                }

                // 권한 확인
                if (role !== 'admin' && reservation.username !== username) {
                    return res.status(403).json({ success: false, message: '본인의 예약만 취소할 수 있습니다.' });
                }

                // 예약 삭제
                const { error: deleteError } = await supabase
                    .from('reservations')
                    .delete()
                    .eq('id', reservationId);

                if (deleteError) {
                    console.error('Reservation deletion error:', deleteError);
                    return res.status(500).json({ success: false, message: '예약 취소 중 오류가 발생했습니다.' });
                }

                return res.json({ success: true, message: '예약이 취소되었습니다.' });

            } catch (error) {
                console.error('Reservation deletion error:', error);
                return res.status(500).json({ success: false, message: '예약 취소 중 오류가 발생했습니다.' });
            }
        }

        // 사용자 목록 API
        if (method === 'GET' && urlPath === '/users') {
            try {
                const { data: users, error } = await supabase
                    .from('users')
                    .select('id, username, name, role, created_at');

                if (error) {
                    console.error('Users query error:', error);
                    return res.status(500).json({ success: false, message: 'Failed to load users' });
                }

                return res.json(users || []);

            } catch (error) {
                console.error('Users API error:', error);
                return res.status(500).json({ success: false, message: 'Failed to load users' });
            }
        }

        // 관리자 통계 API
        if (method === 'GET' && urlPath === '/admin/stats') {
            try {
                const today = new Date().toISOString().split('T')[0];

                const { data: allReservations } = await supabase
                    .from('reservations')
                    .select('*');

                const { data: allUsers } = await supabase
                    .from('users')
                    .select('*')
                    .neq('role', 'admin');

                const upcomingReservations = allReservations?.filter(r => r.date >= today) || [];

                const userStats = (allUsers || []).map(user => {
                    const userReservations = allReservations?.filter(r => r.username === user.username) || [];
                    return {
                        ...user,
                        totalReservations: userReservations.length,
                        upcomingReservations: userReservations.filter(r => r.date >= today).length
                    };
                });

                const facilityStats = Object.keys(facilities).map(key => {
                    const facilityReservations = upcomingReservations.filter(r => r.facility === key);
                    return {
                        facility: key,
                        name: facilities[key].name,
                        reservations: facilityReservations.length,
                        totalSlots: facilityReservations.reduce((acc, r) => acc + (r.time_slots?.length || 0), 0)
                    };
                });

                return res.json({
                    totalUsers: allUsers?.length || 0,
                    totalReservations: allReservations?.length || 0,
                    upcomingReservations: upcomingReservations.length,
                    userStats,
                    facilityStats
                });

            } catch (error) {
                console.error('Admin stats error:', error);
                return res.status(500).json({ success: false, message: 'Failed to load admin stats' });
            }
        }

        // 404 처리
        console.log(`404 - No matching endpoint found for ${method} ${urlPath}`);
        return res.status(404).json({ success: false, message: `API endpoint not found: ${method} ${urlPath}` });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};