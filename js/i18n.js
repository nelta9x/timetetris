/**
 * TimeTetris 국제화(i18n) 시스템
 * 
 * 다국어 지원을 위한 번역 관리 시스템입니다.
 * 브라우저 언어를 자동 감지하고 적절한 언어로 텍스트를 표시합니다.
 */

class I18n {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
        this.loadTranslations();
        
        // 개발용: 초기 언어 설정 로그
        console.log(`TimeTetris i18n initialized with language: ${this.currentLanguage}`);
    }

    /**
     * 언어 설정 로드 (localStorage → 브라우저 언어 순서)
     * @returns {string} 언어 코드 ('ko' 또는 'en')
     */
    detectLanguage() {
        // 1. localStorage에서 저장된 언어 설정 확인
        const savedLanguage = this.loadLanguageFromStorage();
        if (savedLanguage && (savedLanguage === 'ko' || savedLanguage === 'en')) {
            return savedLanguage;
        }
        
        // 2. 저장된 언어가 없으면 브라우저 언어 감지
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.startsWith('ko') ? 'ko' : 'en';
    }

    /**
     * 번역 데이터 로드
     */
    loadTranslations() {
        this.translations = {
            ko: {
                // 네비게이션
                'nav.participants': '참가자 관리',
                'nav.sessions': '세션 관리',
                'nav.calendar': '캘린더 뷰',

                // 헤더 버튼
                'header.export': '내보내기',
                'header.import': '불러오기',
                'header.clear': '모두 지우기',

                // 통계
                'stats.participants': '참가자: {0} (배치됨: {1})',
                'stats.sessions': '세션: {0}',

                // 참가자 관리
                'participants.title': '참가자 관리',
                'participants.add': '새 참가자 추가',
                'participants.search': '참가자 검색...',
                'participants.empty.title': '참가자가 없습니다',
                'participants.empty.description': '새 참가자를 추가하여 시작하세요',
                'participants.status.assigned': '배치됨',
                'participants.status.unassigned': '미배치',
                'participants.priority': '우선순위: {0}',
                'participants.available_times': '가능 시간: {0}개',
                'participants.edit': '편집',
                'participants.delete': '삭제',

                // 세션 관리
                'sessions.title': '세션 관리',
                'sessions.add': '새 세션 추가',
                'sessions.auto_assign_all': '전체 자동 배치',
                'sessions.empty.title': '세션이 없습니다',
                'sessions.empty.description': '새 세션을 추가하여 시작하세요',
                'sessions.status.active': '활성',
                'sessions.status.inactive': '비활성',
                'sessions.duration': '{0}분',
                'sessions.capacity': '배치 현황: {0}/{1}명',
                'sessions.capacity_exceeded': '정원 초과',
                'sessions.no_participants': '배치된 참가자가 없습니다',
                'sessions.edit': '편집',
                'sessions.delete': '삭제',
                'sessions.activate': '활성화',
                'sessions.deactivate': '비활성화',
                'sessions.assign_participant': '참가자 배치',
                'sessions.auto_assign': '이 세션에 자동 배치',

                // 캘린더
                'calendar.title': '캘린더 뷰',
                'calendar.month': '월간',
                'calendar.week': '주간',
                'calendar.day': '일간',
                'calendar.today': '오늘',
                'calendar.current_date': '{0}년 {1}월',
                'calendar.time_label': '시간',
                'calendar.day.sun': '일',
                'calendar.day.mon': '월',
                'calendar.day.tue': '화',
                'calendar.day.wed': '수',
                'calendar.day.thu': '목',
                'calendar.day.fri': '금',
                'calendar.day.sat': '토',

                // 캘린더 날짜 포맷
                'calendar.format.day': '{0}년 {1}월 {2}일 {3}',
                'calendar.format.week_same_year': '{0}월 {1}일 - {2}년 {3}월 {4}일',
                'calendar.format.week_diff_year': '{0}년 {1}월 {2}일 - {3}년 {4}월 {5}일',
                'calendar.format.month': '{0}년 {1}월',
                'calendar.weekday.0': '일요일',
                'calendar.weekday.1': '월요일',
                'calendar.weekday.2': '화요일',
                'calendar.weekday.3': '수요일',
                'calendar.weekday.4': '목요일',
                'calendar.weekday.5': '금요일',
                'calendar.weekday.6': '토요일',
                'calendar.month.1': '1',
                'calendar.month.2': '2',
                'calendar.month.3': '3',
                'calendar.month.4': '4',
                'calendar.month.5': '5',
                'calendar.month.6': '6',
                'calendar.month.7': '7',
                'calendar.month.8': '8',
                'calendar.month.9': '9',
                'calendar.month.10': '10',
                'calendar.month.11': '11',
                'calendar.month.12': '12',
                'calendar.month.short.1': '1',
                'calendar.month.short.2': '2',
                'calendar.month.short.3': '3',
                'calendar.month.short.4': '4',
                'calendar.month.short.5': '5',
                'calendar.month.short.6': '6',
                'calendar.month.short.7': '7',
                'calendar.month.short.8': '8',
                'calendar.month.short.9': '9',
                'calendar.month.short.10': '10',
                'calendar.month.short.11': '11',
                'calendar.month.short.12': '12',

                // 모달 - 참가자
                'modal.participant.title': '참가자 추가/편집',
                'modal.participant.name': '참가자 이름',
                'modal.participant.name_placeholder': '예: 김철수 학생',
                'modal.participant.note': '메모',
                'modal.participant.note_placeholder': '추가 정보를 입력하세요',
                'modal.participant.priority': '우선순위',
                'modal.participant.available_times': '가능한 시간대',
                'modal.participant.time_start': '시작',
                'modal.participant.time_end': '종료',
                'modal.participant.add_time': '시간대 추가',
                'modal.participant.cancel': '취소',
                'modal.participant.save': '저장',

                // 모달 - 세션
                'modal.session.title': '세션 추가/편집',
                'modal.session.name': '세션 이름',
                'modal.session.name_placeholder': '자동 생성됨',
                'modal.session.active': '활성화',
                'modal.session.capacity': '세션 용량 (명)',
                'modal.session.start_time': '시작 시간',
                'modal.session.duration': '지속 시간 (분)',
                'modal.session.cancel': '취소',
                'modal.session.save': '저장',

                // 참가자 배치 모달
                'modal.assign.title': '참가자 배치 - {0}',
                'modal.assign.available_participants': '배치 가능한 참가자 목록:',
                'modal.assign.no_participants': '배치 가능한 참가자가 없습니다.',
                'modal.assign.no_participants_detail': '참가자의 가능 시간이 세션 시간과 겹치지 않거나, 모든 참가자가 이미 배치되었습니다.',
                'modal.assign.priority': '우선순위: {0}',
                'modal.assign.assign_button': '배치',

                // 알림 메시지
                'notification.app_loaded': '앱이 성공적으로 로드되었습니다',
                'notification.participant_assigned': '{0}님이 {1}에 배치되었습니다',
                'notification.participant_unassigned': '{0}님이 배치 해제되었습니다',
                'notification.participant_already_assigned': '{0}님은 이미 다른 세션에 배치되어 있습니다',
                'notification.time_conflict': '참가자의 가능 시간과 세션 시간이 겹치지 않습니다',
                'notification.session_full': '세션이 가득 찼습니다',
                'notification.auto_assign_success': '{0}명의 참가자가 자동 배치되었습니다',
                'notification.auto_assign_none': '자동 배치할 수 있는 참가자가 없습니다',
                'notification.assignment_cleared': '모든 배치가 초기화되었습니다',
                'notification.auto_assign_complete': '전체 자동 배치가 완료되었습니다. {0}명이 배치되었습니다',
                'notification.participant_saved': '참가자가 저장되었습니다',
                'notification.participant_added': '참가자가 추가되었습니다',
                'notification.participant_updated': '참가자가 수정되었습니다',
                'notification.participant_deleted': '참가자가 삭제되었습니다',
                'notification.session_saved': '세션이 저장되었습니다',
                'notification.session_deleted': '세션이 삭제되었습니다',
                'notification.session_activated': '세션이 활성화되었습니다',
                'notification.session_deactivated': '세션이 비활성화되었습니다',
                'notification.all_data_cleared': '모든 데이터가 삭제되었습니다',
                'notification.schedule_moved': '일정이 다른 세션으로 이동되었습니다',
                'notification.invalid_json': '올바른 JSON 파일이 아닙니다',
                'notification.session_full_already': '세션이 이미 가득 찼습니다',
                'notification.no_available_participants': '배치 가능한 참가자가 없습니다',
                'notification.participant_order_changed': '참가자 순서가 변경되었습니다',
                'notification.session_added': '세션이 추가되었습니다',
                'notification.session_updated': '세션이 수정되었습니다',
                'notification.assignment_cancelled': '배치가 취소되었습니다',
                'notification.session_time_changed': '세션 시간이 변경되었습니다',
                'notification.data_exported': '데이터가 내보내기되었습니다',
                'notification.data_imported': '데이터를 성공적으로 불러왔습니다',
                'notification.import_failed': '데이터 불러오기에 실패했습니다',
                'notification.time_not_match': '{0}님의 가능 시간이 세션 시간과 맞지 않습니다',
                'notification.session_capacity_exceeded': '세션 정원이 초과되었습니다 (최대 {0}명)',
                'notification.invalid_time_slot_order': '{0}번째 시간대: 종료 시간이 시작 시간보다 늦어야 합니다.',
                'notification.incomplete_time_slot': '{0}번째 시간대: 시작 시간과 종료 시간을 모두 입력해주세요.',

                // 공통
                'common.required': '*',
                'common.loading': '로딩 중...',
                'common.error': '오류가 발생했습니다',
                'common.confirm_delete': '정말 삭제하시겠습니까?',
                'common.confirm_delete_all': '모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
            },

            en: {
                // Navigation
                'nav.participants': 'Participant Management',
                'nav.sessions': 'Session Management',
                'nav.calendar': 'Calendar View',

                // Header buttons
                'header.export': 'Export',
                'header.import': 'Import',
                'header.clear': 'Clear All',

                // Statistics
                'stats.participants': 'Participants: {0} (Assigned: {1})',
                'stats.sessions': 'Sessions: {0}',

                // Participant management
                'participants.title': 'Participant Management',
                'participants.add': 'Add New Participant',
                'participants.search': 'Search participants...',
                'participants.empty.title': 'No participants',
                'participants.empty.description': 'Add a new participant to get started',
                'participants.status.assigned': 'Assigned',
                'participants.status.unassigned': 'Unassigned',
                'participants.priority': 'Priority: {0}',
                'participants.available_times': 'Available times: {0}',
                'participants.edit': 'Edit',
                'participants.delete': 'Delete',

                // Session management
                'sessions.title': 'Session Management',
                'sessions.add': 'Add New Session',
                'sessions.auto_assign_all': 'Auto Assign All',
                'sessions.empty.title': 'No sessions',
                'sessions.empty.description': 'Add a new session to get started',
                'sessions.status.active': 'Active',
                'sessions.status.inactive': 'Inactive',
                'sessions.duration': '{0} min',
                'sessions.capacity': 'Assigned: {0}/{1}',
                'sessions.capacity_exceeded': 'Over capacity',
                'sessions.no_participants': 'No assigned participants',
                'sessions.edit': 'Edit',
                'sessions.delete': 'Delete',
                'sessions.activate': 'Activate',
                'sessions.deactivate': 'Deactivate',
                'sessions.assign_participant': 'Assign Participant',
                'sessions.auto_assign': 'Auto Assign to This Session',

                // Calendar
                'calendar.title': 'Calendar View',
                'calendar.month': 'Month',
                'calendar.week': 'Week',
                'calendar.day': 'Day',
                'calendar.today': 'Today',
                'calendar.current_date': '{0} {1}',
                'calendar.time_label': 'Time',
                'calendar.day.sun': 'Sun',
                'calendar.day.mon': 'Mon',
                'calendar.day.tue': 'Tue',
                'calendar.day.wed': 'Wed',
                'calendar.day.thu': 'Thu',
                'calendar.day.fri': 'Fri',
                'calendar.day.sat': 'Sat',

                // Calendar date formats
                'calendar.format.day': '{3}, {1} {2}, {0}',
                'calendar.format.week_same_year': '{1} {0} - {4} {3}, {2}',
                'calendar.format.week_diff_year': '{1} {0}, {2} - {4} {3}, {5}',
                'calendar.format.month': '{1} {0}',
                'calendar.weekday.0': 'Sunday',
                'calendar.weekday.1': 'Monday',
                'calendar.weekday.2': 'Tuesday',
                'calendar.weekday.3': 'Wednesday',
                'calendar.weekday.4': 'Thursday',
                'calendar.weekday.5': 'Friday',
                'calendar.weekday.6': 'Saturday',
                'calendar.month.1': 'January',
                'calendar.month.2': 'February',
                'calendar.month.3': 'March',
                'calendar.month.4': 'April',
                'calendar.month.5': 'May',
                'calendar.month.6': 'June',
                'calendar.month.7': 'July',
                'calendar.month.8': 'August',
                'calendar.month.9': 'September',
                'calendar.month.10': 'October',
                'calendar.month.11': 'November',
                'calendar.month.12': 'December',
                'calendar.month.short.1': 'Jan',
                'calendar.month.short.2': 'Feb',
                'calendar.month.short.3': 'Mar',
                'calendar.month.short.4': 'Apr',
                'calendar.month.short.5': 'May',
                'calendar.month.short.6': 'Jun',
                'calendar.month.short.7': 'Jul',
                'calendar.month.short.8': 'Aug',
                'calendar.month.short.9': 'Sep',
                'calendar.month.short.10': 'Oct',
                'calendar.month.short.11': 'Nov',
                'calendar.month.short.12': 'Dec',

                // Modal - Participant
                'modal.participant.title': 'Add/Edit Participant',
                'modal.participant.name': 'Participant Name',
                'modal.participant.name_placeholder': 'e.g., John Smith',
                'modal.participant.note': 'Notes',
                'modal.participant.note_placeholder': 'Enter additional information',
                'modal.participant.priority': 'Priority',
                'modal.participant.available_times': 'Available Time Slots',
                'modal.participant.time_start': 'Start',
                'modal.participant.time_end': 'End',
                'modal.participant.add_time': 'Add Time Slot',
                'modal.participant.cancel': 'Cancel',
                'modal.participant.save': 'Save',

                // Modal - Session
                'modal.session.title': 'Add/Edit Session',
                'modal.session.name': 'Session Name',
                'modal.session.name_placeholder': 'Auto-generated',
                'modal.session.active': 'Active',
                'modal.session.capacity': 'Session Capacity',
                'modal.session.start_time': 'Start Time',
                'modal.session.duration': 'Duration (minutes)',
                'modal.session.cancel': 'Cancel',
                'modal.session.save': 'Save',

                // Assign participant modal
                'modal.assign.title': 'Assign Participant - {0}',
                'modal.assign.available_participants': 'Available participants:',
                'modal.assign.no_participants': 'No available participants.',
                'modal.assign.no_participants_detail': 'Participant availability does not overlap with session time, or all participants are already assigned.',
                'modal.assign.priority': 'Priority: {0}',
                'modal.assign.assign_button': 'Assign',

                // Notifications
                'notification.app_loaded': 'App loaded successfully',
                'notification.participant_assigned': '{0} has been assigned to {1}',
                'notification.participant_unassigned': '{0} has been unassigned',
                'notification.participant_already_assigned': '{0} is already assigned to another session',
                'notification.time_conflict': 'Participant availability does not overlap with session time',
                'notification.session_full': 'Session is full',
                'notification.auto_assign_success': '{0} participants have been auto-assigned',
                'notification.auto_assign_none': 'No participants available for auto-assignment',
                'notification.assignment_cleared': 'All assignments have been cleared',
                'notification.auto_assign_complete': 'Auto-assignment completed. {0} participants assigned',
                'notification.participant_saved': 'Participant saved',
                'notification.participant_added': 'Participant added',
                'notification.participant_updated': 'Participant updated',
                'notification.participant_deleted': 'Participant deleted',
                'notification.session_saved': 'Session saved',
                'notification.session_deleted': 'Session deleted',
                'notification.session_activated': 'Session activated',
                'notification.session_deactivated': 'Session deactivated',
                'notification.all_data_cleared': 'All data has been cleared',
                'notification.schedule_moved': 'Schedule moved to another session',
                'notification.invalid_json': 'Invalid JSON file',
                'notification.session_full_already': 'Session is already full',
                'notification.no_available_participants': 'No available participants for assignment',
                'notification.participant_order_changed': 'Participant order changed',
                'notification.session_added': 'Session added',
                'notification.session_updated': 'Session updated',
                'notification.assignment_cancelled': 'Assignment cancelled',
                'notification.session_time_changed': 'Session time changed',
                'notification.data_exported': 'Data exported successfully',
                'notification.data_imported': 'Data imported successfully',
                'notification.import_failed': 'Failed to import data',
                'notification.time_not_match': '{0}\'s available time does not match session time',
                'notification.session_capacity_exceeded': 'Session capacity exceeded (max {0} participants)',
                'notification.invalid_time_slot_order': 'Time slot {0}: End time must be later than start time.',
                'notification.incomplete_time_slot': 'Time slot {0}: Please enter both start and end times.',

                // Common
                'common.required': '*',
                'common.loading': 'Loading...',
                'common.error': 'An error occurred',
                'common.confirm_delete': 'Are you sure you want to delete?',
                'common.confirm_delete_all': 'Are you sure you want to delete all data? This action cannot be undone.',
            }
        };
    }

    /**
     * 번역된 텍스트 가져오기
     * @param {string} key - 번역 키
     * @param {...any} args - 문자열 포맷팅 인수
     * @returns {string} 번역된 텍스트
     */
    t(key, ...args) {
        const translation = this.translations[this.currentLanguage]?.[key] || 
                          this.translations['en']?.[key] || 
                          key;
        
        // 문자열 포맷팅 ({0}, {1} 등을 args로 치환)
        return this.format(translation, ...args);
    }

    /**
     * 문자열 포맷팅
     * @param {string} str - 포맷팅할 문자열
     * @param {...any} args - 치환할 인수들
     * @returns {string} 포맷팅된 문자열
     */
    format(str, ...args) {
        return str.replace(/\{(\d+)\}/g, (match, index) => {
            return args[index] !== undefined ? args[index] : match;
        });
    }

    /**
     * 언어 변경
     * @param {string} lang - 언어 코드
     */
    setLanguage(lang) {
        this.currentLanguage = lang;
        
        // localStorage에 언어 설정 저장
        this.saveLanguageToStorage(lang);
        
        // DOM 업데이트
        this.updateDOM();
        
        // 앱의 동적 콘텐츠 업데이트
        if (window.app) {
            window.app.updateAllViews();
        }
    }

    /**
     * 현재 언어 가져오기
     * @returns {string} 현재 언어 코드
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * 언어 설정을 localStorage에 저장
     * @param {string} lang - 언어 코드
     */
    saveLanguageToStorage(lang) {
        try {
            localStorage.setItem('timetetris_language', lang);
            console.log(`Language saved to localStorage: ${lang}`);
        } catch (error) {
            console.warn('Failed to save language to localStorage:', error);
        }
    }

    /**
     * localStorage에서 언어 설정 로드
     * @returns {string|null} 저장된 언어 코드 또는 null
     */
    loadLanguageFromStorage() {
        try {
            return localStorage.getItem('timetetris_language');
        } catch (error) {
            console.warn('Failed to load language from localStorage:', error);
            return null;
        }
    }

    /**
     * DOM 요소의 i18n 속성을 기반으로 텍스트 업데이트
     */
    updateDOM() {
        // data-i18n 속성을 가진 요소들의 텍스트 업데이트
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const args = element.getAttribute('data-i18n-args');
            
            if (args) {
                const argArray = args.split(',');
                element.textContent = this.t(key, ...argArray);
            } else {
                element.textContent = this.t(key);
            }
        });

        // data-i18n-title 속성을 가진 요소들의 title 업데이트
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // data-i18n-placeholder 속성을 가진 요소들의 placeholder 업데이트
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
    }
}

// 전역 i18n 인스턴스 생성
window.i18n = new I18n();

// t 함수를 전역으로 노출 (편의를 위해)
window.t = (key, ...args) => window.i18n.t(key, ...args);
