/**
 * Session 클래스
 * 
 * 실제 진행될 세션(시간대)을 나타내는 클래스입니다.
 * 각 세션은 특정 시간에 진행되며, 하나 이상의 일정이 배치될 수 있습니다.
 * 현재는 1:1 세션만 지원하므로 한 세션에 최대 1개의 일정만 배치 가능합니다.
 * 
 * 주요 책임:
 * - 세션의 기본 정보 관리 (이름, 활성화 상태)
 * - 시간대 정보 관리 (시작시간, 지속시간)
 * - 배치된 일정들 관리
 * - 세션 용량 관리 및 배치 가능 여부 확인
 * - 자동 이름 생성 (날짜/시간 기반)
 */
class Session {
    /**
     * Session 생성자
     * @param {Object} data - 세션 데이터
     * @param {string} data.id - 고유 ID (선택사항, 자동 생성)
     * @param {string} data.name - 세션 이름 (선택사항, 자동 생성)
     * @param {boolean} data.enabled - 활성화 상태 (기본값: true)
     * @param {Object} data.timeSlot - 시간대 정보
     * @param {string} data.timeSlot.datetime - 시작 시간 (ISO 문자열)
     * @param {number} data.timeSlot.duration - 지속 시간 (분)
     * @param {Array} data.assignedSchedules - 배치된 일정 ID 배열
     */
    constructor(data = {}) {
        this.id = data.id || this.generateGUID();
        this.name = data.name || this.generateDefaultName(data.timeSlot);
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.timeSlot = data.timeSlot || null;
        this.assignedSchedules = data.assignedSchedules || [];
    }

    /**
     * 고유 ID 생성
     * @returns {string} 고유한 세션 ID
     */
    generateGUID() {
        return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 시간대 정보를 기반으로 기본 이름 생성
     * @param {Object} timeSlot - 시간대 정보
     * @returns {string} 생성된 세션 이름 (예: "월_1/15_14:00_60분")
     */
    generateDefaultName(timeSlot) {
        if (!timeSlot || !timeSlot.datetime) return '새 세션';
        
        const date = new Date(timeSlot.datetime);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = days[date.getDay()];
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        const duration = timeSlot.duration || 60;
        
        return `${dayName}_${dateStr}_${timeStr}_${duration}분`;
    }

    /**
     * 세션에 추가 배치가 가능한지 확인
     * @returns {boolean} 배치 가능하면 true
     */
    hasCapacity() {
        // 현재는 1:1 세션만 지원 (한 세션에 한 명만)
        return this.assignedSchedules.length < 1;
    }

    /**
     * 세션에 일정 배치
     * @param {string} scheduleId - 배치할 일정의 ID
     * @returns {boolean} 성공하면 true, 실패하면 false
     */
    addSchedule(scheduleId) {
        if (this.hasCapacity() && !this.assignedSchedules.includes(scheduleId)) {
            this.assignedSchedules.push(scheduleId);
            return true;
        }
        return false;
    }

    /**
     * 세션에서 일정 제거
     * @param {string} scheduleId - 제거할 일정의 ID
     * @returns {boolean} 성공하면 true, 실패하면 false
     */
    removeSchedule(scheduleId) {
        const index = this.assignedSchedules.indexOf(scheduleId);
        if (index > -1) {
            this.assignedSchedules.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 세션 객체를 JSON으로 직렬화
     * @returns {Object} 직렬화된 세션 데이터
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            enabled: this.enabled,
            timeSlot: this.timeSlot,
            assignedSchedules: this.assignedSchedules
        };
    }

    /**
     * 세션이 완전히 채워졌는지 확인
     * @returns {boolean} 완전히 채워졌으면 true
     */
    isFull() {
        return !this.hasCapacity();
    }

    /**
     * 세션이 비어있는지 확인
     * @returns {boolean} 비어있으면 true
     */
    isEmpty() {
        return this.assignedSchedules.length === 0;
    }

    /**
     * 세션 활성화/비활성화 토글
     */
    toggle() {
        this.enabled = !this.enabled;
    }

    /**
     * 세션의 시작 시간 가져오기
     * @returns {Date|null} 시작 시간 Date 객체 또는 null
     */
    getStartTime() {
        return this.timeSlot ? new Date(this.timeSlot.datetime) : null;
    }

    /**
     * 세션의 종료 시간 가져오기
     * @returns {Date|null} 종료 시간 Date 객체 또는 null
     */
    getEndTime() {
        if (!this.timeSlot) return null;
        const start = new Date(this.timeSlot.datetime);
        return new Date(start.getTime() + this.timeSlot.duration * 60000);
    }

    /**
     * 모든 배치된 일정 제거
     */
    clearAllSchedules() {
        this.assignedSchedules = [];
    }

    /**
     * 세션의 현재 사용률 계산
     * @returns {number} 사용률 (0-100%)
     */
    getUtilizationRate() {
        const maxCapacity = 1; // 현재는 1:1 세션만 지원
        return Math.round((this.assignedSchedules.length / maxCapacity) * 100);
    }
}
