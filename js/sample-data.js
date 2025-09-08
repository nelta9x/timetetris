// 예시 데이터 생성 함수

function loadSampleData() {
    const dataStore = app.dataStore;
    
    // 현재 날짜 기준으로 데이터 생성
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    // 시나리오 1: 영어 과외 선생님 예제
    const englishTeacherExample = () => {
        // 세션 생성 (월/수/금 오후 3-8시)
        const sessions = [];
        
        // 이번 주 월요일 찾기
        const monday = new Date(today);
        const day = monday.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(monday.getDate() + diff);
        monday.setHours(15, 0, 0, 0);
        
        // 월요일 세션들
        for (let hour = 15; hour < 20; hour++) {
            const sessionTime = new Date(monday);
            sessionTime.setHours(hour, 0, 0, 0);
            
            const session = new Session({
                name: `월요일 ${hour}:00-${hour+1}:00`,
                enabled: true,
                timeSlot: {
                    datetime: sessionTime.toISOString(),
                    duration: 60
                }
            });
            sessions.push(session);
            dataStore.addSession(session);
        }
        
        // 수요일 세션들
        const wednesday = new Date(monday);
        wednesday.setDate(wednesday.getDate() + 2);
        
        for (let hour = 15; hour < 20; hour++) {
            const sessionTime = new Date(wednesday);
            sessionTime.setHours(hour, 0, 0, 0);
            
            const session = new Session({
                name: `수요일 ${hour}:00-${hour+1}:00`,
                enabled: true,
                timeSlot: {
                    datetime: sessionTime.toISOString(),
                    duration: 60
                }
            });
            sessions.push(session);
            dataStore.addSession(session);
        }
        
        // 금요일 세션들
        const friday = new Date(monday);
        friday.setDate(friday.getDate() + 4);
        
        for (let hour = 15; hour < 20; hour++) {
            const sessionTime = new Date(friday);
            sessionTime.setHours(hour, 0, 0, 0);
            
            const session = new Session({
                name: `금요일 ${hour}:00-${hour+1}:00`,
                enabled: true,
                timeSlot: {
                    datetime: sessionTime.toISOString(),
                    duration: 60
                }
            });
            sessions.push(session);
            dataStore.addSession(session);
        }
        
        // 학생들 일정 생성
        // 학생 A: 월 3-5시, 수 3-7시 가능
        const studentA = new Schedule({
            name: '김민준 학생',
            note: '영어 기초반, 문법 중심 수업',
            priority: 3,
            availableSlots: [
                {
                    datetime: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 15, 0).toISOString(),
                    duration: 120
                },
                {
                    datetime: new Date(wednesday.getFullYear(), wednesday.getMonth(), wednesday.getDate(), 15, 0).toISOString(),
                    duration: 240
                }
            ]
        });
        dataStore.addSchedule(studentA);
        
        // 학생 B: 월 5-8시, 금 3-8시 가능
        const studentB = new Schedule({
            name: '이서연 학생',
            note: '회화 중심, TOEIC 준비',
            priority: 2,
            availableSlots: [
                {
                    datetime: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 17, 0).toISOString(),
                    duration: 180
                },
                {
                    datetime: new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 15, 0).toISOString(),
                    duration: 300
                }
            ]
        });
        dataStore.addSchedule(studentB);
        
        // 학생 C: 월/수/금 3-8시 모두 가능
        const studentC = new Schedule({
            name: '박지호 학생',
            note: '고급반, 에세이 작성 연습',
            priority: 1,
            availableSlots: [
                {
                    datetime: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 15, 0).toISOString(),
                    duration: 300
                },
                {
                    datetime: new Date(wednesday.getFullYear(), wednesday.getMonth(), wednesday.getDate(), 15, 0).toISOString(),
                    duration: 300
                },
                {
                    datetime: new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 15, 0).toISOString(),
                    duration: 300
                }
            ]
        });
        dataStore.addSchedule(studentC);
        
        // 학생 D: 수/금 오후 6-8시 가능
        const studentD = new Schedule({
            name: '최수민 학생',
            note: '비즈니스 영어, 프레젠테이션 스킬',
            priority: 2,
            availableSlots: [
                {
                    datetime: new Date(wednesday.getFullYear(), wednesday.getMonth(), wednesday.getDate(), 18, 0).toISOString(),
                    duration: 120
                },
                {
                    datetime: new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 18, 0).toISOString(),
                    duration: 120
                }
            ]
        });
        dataStore.addSchedule(studentD);
    };
    
    // 시나리오 2: PT 트레이너 예제
    const ptTrainerExample = () => {
        // 세션 생성 (화/목 9시-22시)
        const sessions = [];
        
        // 이번 주 화요일 찾기
        const tuesday = new Date(today);
        const day = tuesday.getDay();
        const diff = day === 0 ? 2 : day === 1 ? 1 : day === 2 ? 0 : 2 - day + 7;
        tuesday.setDate(tuesday.getDate() + diff);
        
        // 화요일 세션들 (30분 단위)
        for (let hour = 9; hour < 22; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const sessionTime = new Date(tuesday);
                sessionTime.setHours(hour, min, 0, 0);
                
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                const endMin = min + 30;
                const endHour = endMin >= 60 ? hour + 1 : hour;
                const endMinStr = (endMin % 60).toString().padStart(2, '0');
                const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinStr}`;
                
                const session = new Session({
                    name: `화요일 ${timeStr}-${endTimeStr}`,
                    enabled: true,
                    timeSlot: {
                        datetime: sessionTime.toISOString(),
                        duration: 30
                    }
                });
                sessions.push(session);
                dataStore.addSession(session);
            }
        }
        
        // 목요일 세션들 (30분 단위)
        const thursday = new Date(tuesday);
        thursday.setDate(thursday.getDate() + 2);
        
        for (let hour = 9; hour < 22; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const sessionTime = new Date(thursday);
                sessionTime.setHours(hour, min, 0, 0);
                
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                const endMin = min + 30;
                const endHour = endMin >= 60 ? hour + 1 : hour;
                const endMinStr = (endMin % 60).toString().padStart(2, '0');
                const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinStr}`;
                
                const session = new Session({
                    name: `목요일 ${timeStr}-${endTimeStr}`,
                    enabled: true,
                    timeSlot: {
                        datetime: sessionTime.toISOString(),
                        duration: 30
                    }
                });
                sessions.push(session);
                dataStore.addSession(session);
            }
        }
        
        // PT 회원들 일정 생성
        // 회원 A: 화 오전, 목 오전 가능, 주 2회
        const memberA = new Schedule({
            name: '강민수 회원',
            note: '체중감량 목표, 유산소 중심',
            priority: 3,
            availableSlots: [
                {
                    datetime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 9, 0).toISOString(),
                    duration: 180
                },
                {
                    datetime: new Date(thursday.getFullYear(), thursday.getMonth(), thursday.getDate(), 9, 0).toISOString(),
                    duration: 180
                }
            ]
        });
        dataStore.addSchedule(memberA);
        
        // 회원 B: 화/목 저녁 가능, 주 1회
        const memberB = new Schedule({
            name: '정수진 회원',
            note: '근력 증가 목표, 웨이트 중심',
            priority: 2,
            availableSlots: [
                {
                    datetime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 19, 0).toISOString(),
                    duration: 180
                },
                {
                    datetime: new Date(thursday.getFullYear(), thursday.getMonth(), thursday.getDate(), 19, 0).toISOString(),
                    duration: 180
                }
            ]
        });
        dataStore.addSchedule(memberB);
        
        // 회원 C: 언제든 가능, 주 3회 희망
        const memberC = new Schedule({
            name: '오현우 회원',
            note: '전신 운동, 체력 향상',
            priority: 1,
            availableSlots: [
                {
                    datetime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 9, 0).toISOString(),
                    duration: 780 // 13시간
                },
                {
                    datetime: new Date(thursday.getFullYear(), thursday.getMonth(), thursday.getDate(), 9, 0).toISOString(),
                    duration: 780
                }
            ]
        });
        dataStore.addSchedule(memberC);
        
        // 회원 D: 점심시간만 가능
        const memberD = new Schedule({
            name: '김예린 회원',
            note: '코어 강화, 자세 교정',
            priority: 4,
            availableSlots: [
                {
                    datetime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 12, 0).toISOString(),
                    duration: 90
                },
                {
                    datetime: new Date(thursday.getFullYear(), thursday.getMonth(), thursday.getDate(), 12, 0).toISOString(),
                    duration: 90
                }
            ]
        });
        dataStore.addSchedule(memberD);
        
        // 회원 E: 저녁 늦은 시간만 가능
        const memberE = new Schedule({
            name: '황준호 회원',
            note: '체형 교정, 재활 운동',
            priority: 2,
            availableSlots: [
                {
                    datetime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 20, 30).toISOString(),
                    duration: 90
                },
                {
                    datetime: new Date(thursday.getFullYear(), thursday.getMonth(), thursday.getDate(), 20, 30).toISOString(),
                    duration: 90
                }
            ]
        });
        dataStore.addSchedule(memberE);
    };
    
    // 어떤 예제를 로드할지 사용자에게 선택하게 함
    const choice = confirm('예시 데이터를 로드하시겠습니까?\n\n확인: 영어 과외 선생님 시나리오\n취소: PT 트레이너 시나리오');
    
    // 기존 데이터 초기화
    dataStore.clearAll();
    
    if (choice) {
        englishTeacherExample();
        app.showNotification('영어 과외 선생님 예시 데이터가 로드되었습니다', 'success');
    } else {
        ptTrainerExample();
        app.showNotification('PT 트레이너 예시 데이터가 로드되었습니다', 'success');
    }
    
    // 뷰 업데이트
    app.updateAllViews();
}

// 첫 실행 시 예시 데이터 로드 제안
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const hasData = localStorage.getItem('timetetris_data');
        if (!hasData) {
            const loadExample = confirm('TimeTetris에 오신 것을 환영합니다!\n\n예시 데이터를 로드하여 기능을 체험해보시겠습니까?');
            if (loadExample) {
                loadSampleData();
            }
        }
    }, 500);
});
