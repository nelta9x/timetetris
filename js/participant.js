/**
 * Participant 클래스
 * 
 * 미팅 참가자를 나타내는 클래스입니다.
 * 각 참가자는 이름, 우선순위, 가능한 시간대 등의 정보를 가지며,
 * 미팅 세션에 배치될 수 있는지 확인하는 로직을 포함합니다.
 * 
 * 주요 책임:
 * - 참가자의 기본 정보 관리 (이름, 메모, 우선순위)
 * - 가능한 시간대(availableSlots) 관리
 * - 배치된 세션 정보 추적
 * - 특정 시간대에 참가가 가능한지 검증
 * - 세션과의 시간 호환성 확인
 */
class Participant {
    /**
     * Participant 생성자
     * @param {Object} data - 참가자 데이터
     * @param {string} data.id - 고유 ID (선택사항, 자동 생성)
     * @param {string} data.name - 참가자 이름
     * @param {string} data.note - 메모 (선택사항)
     * @param {Array} data.availableSlots - 가능한 시간대 배열
     * @param {number} data.priority - 우선순위 (1-10, 기본값: 1)
     */
    constructor(data = {}) {
        this.id = data.id || this.generateGUID();
        this.name = data.name || '';
        this.note = data.note || '';
        this.availableSlots = data.hasOwnProperty('availableSlots') ? data.availableSlots : this.createDefaultTimeSlot();
        this.priority = data.priority || 1;
        // assignedSession 제거 - Session.assignedParticipants에서 관리
    }

    /**
     * 고유 ID 생성
     * @returns {string} 고유한 참가자 ID
     */
    generateGUID() {
        return 'participant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 기본 시간대 생성
     * 새로운 참가자가 생성될 때 기본적으로 하나의 시간대를 제공합니다.
     * @returns {Array} 기본 시간대 배열 (1개 요소)
     */
    createDefaultTimeSlot() {
        const now = new Date();
        // 다음 주 월요일 09:00으로 기본 시작 시간 설정
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
        nextMonday.setHours(9, 0, 0, 0);
        
        // 기본 종료 시간은 시작 시간 + 2시간
        const endTime = new Date(nextMonday);
        endTime.setHours(11, 0, 0, 0);
        
        // 지속 시간 계산 (분 단위)
        const duration = (endTime.getTime() - nextMonday.getTime()) / 60000;
        
        return [{
            datetime: nextMonday.toISOString(),
            duration: duration
        }];
    }

    /**
     * 특정 시간대에 참가가 가능한지 확인
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
     * 세션에 이 참가자가 배치 가능한지 확인
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

            // 세션 시간이 참가자의 가능한 시간 슬롯 내에 완전히 포함되는지 확인
            return sessionStart >= slotStart && sessionEnd <= slotEnd;
        });
    }

    /**
     * 참가자 객체를 JSON으로 직렬화
     * @returns {Object} 직렬화된 참가자 데이터
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            note: this.note,
            availableSlots: this.availableSlots,
            priority: this.priority
            // assignedSession 제거 - Session.assignedParticipants에서 관리
        };
    }

    /**
     * 참가자가 현재 배치되어 있는지 확인
     * @deprecated DataStore.isParticipantAssigned(participantId)를 사용하세요
     * @returns {boolean} 배치되어 있으면 false (항상 false 반환)
     */
    isAssigned() {
        // assignedSession 제거됨 - DataStore에서 확인해야 함
        return false;
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
