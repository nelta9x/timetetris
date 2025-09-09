/**
 * Session 클래스
 *
 * 실제 진행될 세션(시간대)을 나타내는 클래스입니다.
 * 각 세션은 특정 시간에 진행되며, 하나 이상의 참가자가 배치될 수 있습니다.
 *
 * 주요 책임:
 * - 세션의 기본 정보 관리 (이름, 활성화 상태)
 * - 시간대 정보 관리 (시작시간, 지속시간)
 * - 배치된 참가자들 관리
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
     * @param {Array} data.assignedParticipants - 배치된 참가자 ID 배열
     */
    constructor(data = {}) {
        this.id = data.id || this.generateGUID();
        this.name = data.name || this.generateDefaultName(data.timeSlot);
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.capacity = data.capacity || 1;
        this.timeSlot = data.timeSlot || null;
        this.assignedParticipants = data.assignedParticipants || [];
    }

    /**
     * GUID 생성
     * @returns {string} 생성된 GUID
     */
    generateGUID() {
        return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 기본 세션 이름 생성
     * @param {Object} timeSlot - 시간대 정보
     * @returns {string} 생성된 세션 이름
     */
    generateDefaultName(timeSlot) {
        if (!timeSlot || !timeSlot.datetime) {
            return '새 세션';
        }

        try {
            const date = new Date(timeSlot.datetime);
            const dateStr = date.toLocaleDateString('ko-KR');
            const timeStr = date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const duration = timeSlot.duration || 60;
            return `${dateStr} ${timeStr} (${duration}분)`;
        } catch (error) {
            return '새 세션';
        }
    }

    /**
     * 참가자 배치
     * @param {string} participantId - 배치할 참가자 ID
     * @returns {boolean} 배치 성공 여부
     */
    addParticipant(participantId) {
        if (!this.enabled) {
            return false;
        }

        if (this.assignedParticipants.length >= this.capacity) {
            return false;
        }

        if (!this.assignedParticipants.includes(participantId)) {
            this.assignedParticipants.push(participantId);
            return true;
        }

        return false;
    }

    /**
     * 참가자 배치 해제
     * @param {string} participantId - 배치 해제할 참가자 ID
     * @returns {boolean} 배치 해제 성공 여부
     */
    removeParticipant(participantId) {
        const index = this.assignedParticipants.indexOf(participantId);
        if (index > -1) {
            this.assignedParticipants.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 용량 확인
     * @returns {boolean} 용량이 가득 찼는지 여부
     */
    hasCapacity() {
        return this.assignedParticipants.length < this.capacity;
    }

    /**
     * 이용률 계산
     * @returns {number} 이용률 (0-100)
     */
    getUtilizationRate() {
        if (this.capacity === 0) return 0;
        return Math.round((this.assignedParticipants.length / this.capacity) * 100);
    }

    /**
     * JSON 직렬화
     * @returns {Object} JSON으로 변환된 객체
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            enabled: this.enabled,
            capacity: this.capacity,
            timeSlot: this.timeSlot,
            assignedParticipants: this.assignedParticipants
        };
    }
}

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.Session = Session;
}