/**
 * Schedule 클래스
 * 
 * 개별 일정(스케줄)을 나타내는 클래스입니다.
 * 각 일정은 이름, 우선순위, 가능한 시간대 등의 정보를 가지며,
 * 세션에 배치될 수 있는지 확인하는 로직을 포함합니다.
 * 
 * 주요 책임:
 * - 일정의 기본 정보 관리 (이름, 메모, 우선순위)
 * - 가능한 시간대(availableSlots) 관리
 * - 배치된 세션 정보 추적
 * - 특정 시간대에 일정이 가능한지 검증
 * - 세션과의 시간 호환성 확인
 */
class Schedule {
    /**
     * Schedule 생성자
     * @param {Object} data - 일정 데이터
     * @param {string} data.id - 고유 ID (선택사항, 자동 생성)
     * @param {string} data.name - 일정 이름
     * @param {string} data.note - 메모 (선택사항)
     * @param {Array} data.availableSlots - 가능한 시간대 배열
     * @param {string} data.assignedSession - 배치된 세션 ID (선택사항)
     * @param {number} data.priority - 우선순위 (1-10, 기본값: 1)
     */
    constructor(data = {}) {
        this.id = data.id || this.generateGUID();
        this.name = data.name || '';
        this.note = data.note || '';
        this.availableSlots = data.availableSlots || [];
        this.assignedSession = data.assignedSession || null;
        this.priority = data.priority || 1;
    }

    /**
     * 고유 ID 생성
     * @returns {string} 고유한 일정 ID
     */
    generateGUID() {
        return 'schedule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 특정 시간대에 일정이 가능한지 확인
     * @param {string} datetime - 확인할 시작 시간 (ISO 문자열)
     * @param {number} duration - 지속 시간 (분)
     * @returns {boolean} 가능하면 true, 불가능하면 false
     */
    isAvailableAt(datetime, duration) {
        const requestedStart = new Date(datetime);
        const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

        return this.availableSlots.some(slot => {
            const slotStart = new Date(slot.datetime);
            const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);

            // 요청된 시간이 슬롯 시간 범위 내에 완전히 포함되는지 확인
            return requestedStart >= slotStart && requestedEnd <= slotEnd;
        });
    }

    /**
     * 세션에 이 일정이 배치 가능한지 확인
     * @param {Session} session - 확인할 세션 객체
     * @returns {boolean} 배치 가능하면 true, 불가능하면 false
     */
    canFitInSession(session) {
        if (!session || !session.enabled) return false;
        
        const sessionStart = new Date(session.timeSlot.datetime);
        const sessionEnd = new Date(sessionStart.getTime() + session.timeSlot.duration * 60000);

        return this.availableSlots.some(slot => {
            const slotStart = new Date(slot.datetime);
            const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);

            // 세션 시간이 일정의 가능한 시간 슬롯 내에 완전히 포함되는지 확인
            return sessionStart >= slotStart && sessionEnd <= slotEnd;
        });
    }

    /**
     * 일정 객체를 JSON으로 직렬화
     * @returns {Object} 직렬화된 일정 데이터
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            note: this.note,
            availableSlots: this.availableSlots,
            assignedSession: this.assignedSession,
            priority: this.priority
        };
    }

    /**
     * 일정이 현재 배치되어 있는지 확인
     * @returns {boolean} 배치되어 있으면 true
     */
    isAssigned() {
        return this.assignedSession !== null;
    }

    /**
     * 가능한 시간대 추가
     * @param {Object} slot - 시간대 객체
     * @param {string} slot.datetime - 시작 시간 (ISO 문자열)
     * @param {number} slot.duration - 지속 시간 (분)
     */
    addAvailableSlot(slot) {
        if (slot.datetime && slot.duration > 0) {
            this.availableSlots.push(slot);
        }
    }

    /**
     * 가능한 시간대 제거
     * @param {number} index - 제거할 시간대의 인덱스
     */
    removeAvailableSlot(index) {
        if (index >= 0 && index < this.availableSlots.length) {
            this.availableSlots.splice(index, 1);
        }
    }

    /**
     * 배치된 세션 해제
     */
    unassign() {
        this.assignedSession = null;
    }
}
