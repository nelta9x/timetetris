/**
 * Scheduler 클래스
 * 
 * TimeTetris 애플리케이션의 핵심 자동 배치 알고리즘을 담당하는 클래스입니다.
 * 참가자(Participant)들을 세션(Session)에 최적으로 배치하는 다양한 알고리즘을 제공합니다.
 * 
 * 주요 책임:
 * - 참가자와 세션 간의 시간 호환성 검증
 * - 우선순위 기반 자동 배치 알고리즘 실행
 * - Greedy 알고리즘과 백트래킹 알고리즘 제공
 * - 배치 결과 통계 및 분석
 * - 배치 최적화 점수 계산
 * - 사용자를 위한 배치 개선 제안 생성
 * 
 * 알고리즘 종류:
 * 1. Greedy 알고리즘 (기본): 빠르고 효율적, 대용량 데이터 처리 가능
 * 2. 백트래킹 알고리즘 (최적화): 소규모 데이터에서 최적해 보장
 * 3. Fisher-Yates 셔플: 공정한 무작위 배치 보장
 * 
 * 배치 전략:
 * - 우선순위 높은 일정 우선 배치
 * - 1:1 세션만 지원 (한 세션에 최대 1개 일정)
 * - 시간대 완전 포함 검증 (세션 시간이 일정 가능 시간 내에 완전히 포함)
 * - 활성화된 세션만 배치 대상
 * 
 * 성능 고려사항:
 * - 20개 이하 일정 & 10개 이하 세션: 백트래킹 사용
 * - 그 이상: Greedy 알고리즘 사용
 */
class Scheduler {
    /**
     * Scheduler 생성자
     * @param {DataStore} dataStore - 일정과 세션 데이터를 관리하는 DataStore 인스턴스
     */
    constructor(dataStore) {
        /** @type {DataStore} 데이터 저장소 참조 */
        this.dataStore = dataStore;
    }

    /**
     * Fisher-Yates 셔플 알고리즘을 사용한 배열 무작위 섞기
     * 공정한 배치를 위해 가능한 세션 목록을 무작위로 섞습니다.
     * 
     * @param {Array} array - 섞을 배열
     * @returns {Array} 섞인 새로운 배열
     */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * 메인 자동 배치 실행 함수 (Greedy 알고리즘)
     * 
     * 알고리즘 단계:
     * 1. 기존 모든 배치 초기화
     * 2. 활성화된 세션과 모든 일정 수집
     * 3. 우선순위 기준으로 일정 정렬 (높은 순)
     * 4. 각 일정별 가능한 세션 목록 생성
     * 5. 최대 매칭 알고리즘으로 배치 실행
     * 6. 결과 저장 및 통계 반환
     * 
     * @returns {Object} 배치 결과 - {assigned: number, failed: number}
     */
    autoAssign() {
        // 기존 배치 초기화
        this.dataStore.clearAllAssignments();

        // 활성화된 세션과 일정 가져오기
        const sessions = this.dataStore.getAllSessions().filter(s => s.enabled);
        const participants = this.dataStore.getAllParticipants();

        if (sessions.length === 0 || participants.length === 0) {
            return { assigned: 0, failed: participants.length };
        }

        // 우선순위로 참가자 정렬 (높은 우선순위 먼저)
        const sortedParticipants = [...participants].sort((a, b) => b.priority - a.priority);

        // 각 참가자에 대해 가능한 세션 찾기
        const possibleAssignments = this.findPossibleAssignments(sortedParticipants, sessions);

        // 최대 매칭 알고리즘 실행
        const assignments = this.findMaximumMatching(possibleAssignments, sortedParticipants, sessions);

        // 배치 실행
        let assignedCount = 0;
        let failedCount = 0;

        assignments.forEach((sessionId, participantId) => {
            if (sessionId) {
                const participant = this.dataStore.getParticipant(participantId);
                const session = this.dataStore.getSession(sessionId);
                
                if (participant && session && session.addParticipant(participantId)) {
                    participant.assignedSession = sessionId;
                    assignedCount++;
                } else {
                    failedCount++;
                }
            } else {
                failedCount++;
            }
        });

        // 저장
        this.dataStore.saveToLocalStorage();

        return { assigned: assignedCount, failed: failedCount };
    }

    /**
     * 각 일정에 대해 배치 가능한 세션 목록 생성
     * 
     * @param {Schedule[]} schedules - 배치할 일정들
     * @param {Session[]} sessions - 사용 가능한 세션들
     * @returns {Map<string, string[]>} 일정ID -> 가능한 세션ID 배열 매핑
     */
    findPossibleAssignments(schedules, sessions) {
        const possibleAssignments = new Map();

        schedules.forEach(schedule => {
            const possibleSessions = [];

            sessions.forEach(session => {
                if (this.canAssignToSession(schedule, session)) {
                    possibleSessions.push(session.id);
                }
            });

            // 무작위 순서로 섞어서 공정한 배치 보장
            possibleAssignments.set(schedule.id, this.shuffle(possibleSessions));
        });

        return possibleAssignments;
    }

    /**
     * 특정 일정이 특정 세션에 배치 가능한지 검증
     * 
     * 검증 조건:
     * 1. 세션이 활성화되어 있어야 함
     * 2. 세션에 여유 용량이 있어야 함
     * 3. 세션 시간이 일정의 가능한 시간대 내에 완전히 포함되어야 함
     * 
     * @param {Schedule} schedule - 검증할 일정
     * @param {Session} session - 검증할 세션
     * @returns {boolean} 배치 가능하면 true
     */
    canAssignToSession(schedule, session) {
        if (!session.enabled || !session.hasCapacity()) {
            return false;
        }

        // 세션 시간이 일정의 가능한 시간 내에 있는지 확인
        return schedule.canFitInSession(session);
    }

    /**
     * 최대 매칭 알고리즘 (Greedy 방식)
     * 
     * 우선순위 순서로 일정을 처리하며, 각 일정에 대해 
     * 사용 가능한 첫 번째 세션에 배치합니다.
     * 
     * @param {Map} possibleAssignments - 일정별 가능한 세션 목록
     * @param {Schedule[]} schedules - 우선순위 정렬된 일정 배열
     * @param {Session[]} sessions - 사용 가능한 세션 배열
     * @returns {Map<string, string|null>} 일정ID -> 배치된 세션ID 매핑
     */
    findMaximumMatching(possibleAssignments, schedules, sessions) {
        const assignments = new Map();
        const usedSessions = new Set();

        // 우선순위 순으로 처리
        schedules.forEach(schedule => {
            const possibleSessions = possibleAssignments.get(schedule.id) || [];
            
            // 사용 가능한 첫 번째 세션 찾기
            for (const sessionId of possibleSessions) {
                if (!usedSessions.has(sessionId)) {
                    assignments.set(schedule.id, sessionId);
                    usedSessions.add(sessionId);
                    break;
                }
            }

            // 배치되지 않은 경우
            if (!assignments.has(schedule.id)) {
                assignments.set(schedule.id, null);
            }
        });

        return assignments;
    }

    /**
     * 최적화된 배치 알고리즘 (백트래킹 포함)
     * 
     * 데이터 크기에 따라 알고리즘 선택:
     * - 소규모 (일정 ≤20, 세션 ≤10): 백트래킹으로 최적해 탐색
     * - 대규모: Greedy 알고리즘으로 빠른 처리
     * 
     * @returns {Object} 배치 결과 - {assigned: number, failed: number}
     */
    optimizedAssign() {
        const sessions = this.dataStore.getAllSessions().filter(s => s.enabled);
        const participants = this.dataStore.getAllParticipants();

        if (sessions.length === 0 || schedules.length === 0) {
            return { assigned: 0, failed: schedules.length };
        }

        // 소규모 데이터셋에서는 백트래킹 사용
        if (schedules.length <= 20 && sessions.length <= 10) {
            return this.backtrackingAssign(schedules, sessions);
        }

        // 대규모 데이터셋에서는 Greedy 알고리즘 사용
        return this.autoAssign();
    }

    /**
     * 백트래킹을 사용한 최적 배치 찾기
     * 
     * 모든 가능한 배치 조합을 탐색하여 최대한 많은 일정을 배치하는
     * 최적해를 찾습니다. 계산 복잡도가 높아 소규모 데이터에서만 사용합니다.
     * 
     * @param {Schedule[]} schedules - 배치할 일정들
     * @param {Session[]} sessions - 사용 가능한 세션들
     * @returns {Object} 배치 결과 - {assigned: number, failed: number}
     */
    backtrackingAssign(schedules, sessions) {
        this.dataStore.clearAllAssignments();

        const sortedSchedules = [...schedules].sort((a, b) => b.priority - a.priority);
        const assignments = new Map();
        const sessionCapacity = new Map();

        // 세션 용량 초기화 (현재는 1:1 세션만 지원)
        sessions.forEach(session => {
            sessionCapacity.set(session.id, 1);
        });

        const bestAssignment = this.backtrack(
            0,
            sortedSchedules,
            sessions,
            assignments,
            sessionCapacity,
            { best: new Map(), count: 0 }
        );

        // 최적 배치 적용
        let assignedCount = 0;
        let failedCount = 0;

        bestAssignment.best.forEach((sessionId, scheduleId) => {
            if (sessionId) {
                const schedule = this.dataStore.getSchedule(scheduleId);
                const session = this.dataStore.getSession(sessionId);
                
                if (schedule && session && session.addSchedule(scheduleId)) {
                    schedule.assignedSession = sessionId;
                    assignedCount++;
                } else {
                    failedCount++;
                }
            } else {
                failedCount++;
            }
        });

        this.dataStore.saveToLocalStorage();
        return { assigned: assignedCount, failed: failedCount };
    }

    /**
     * 백트래킹 재귀 함수
     * 
     * 깊이 우선 탐색으로 모든 가능한 배치를 시도하며,
     * 현재까지 찾은 최적해보다 더 좋은 해를 발견하면 업데이트합니다.
     * 
     * @param {number} index - 현재 처리 중인 일정 인덱스
     * @param {Schedule[]} schedules - 처리할 일정 배열
     * @param {Session[]} sessions - 사용 가능한 세션 배열
     * @param {Map} assignments - 현재 배치 상태
     * @param {Map} sessionCapacity - 세션별 남은 용량
     * @param {Object} result - 최적 결과 저장 객체
     * @returns {Object} 최적 배치 결과
     */
    backtrack(index, schedules, sessions, assignments, sessionCapacity, result) {
        if (index === schedules.length) {
            // 현재 배치가 더 나은지 확인
            const currentCount = Array.from(assignments.values()).filter(v => v !== null).length;
            if (currentCount > result.count) {
                result.best = new Map(assignments);
                result.count = currentCount;
            }
            return result;
        }

        const schedule = schedules[index];

        // 가능한 모든 세션 시도
        for (const session of sessions) {
            if (this.canAssignToSession(schedule, session) && 
                sessionCapacity.get(session.id) > 0) {
                
                // 배치 시도
                assignments.set(schedule.id, session.id);
                sessionCapacity.set(session.id, sessionCapacity.get(session.id) - 1);

                // 재귀 호출
                this.backtrack(index + 1, schedules, sessions, assignments, sessionCapacity, result);

                // 백트래킹 (상태 복원)
                assignments.delete(schedule.id);
                sessionCapacity.set(session.id, sessionCapacity.get(session.id) + 1);
            }
        }

        // 배치하지 않는 경우도 시도
        assignments.set(schedule.id, null);
        this.backtrack(index + 1, schedules, sessions, assignments, sessionCapacity, result);
        assignments.delete(schedule.id);

        return result;
    }

    /**
     * 시간 충돌 확인 함수
     * 
     * 현재 구현에서는 1:1 세션만 지원하므로 충돌이 발생하지 않습니다.
     * 향후 그룹 세션 지원 시 활용될 예정입니다.
     * 
     * @param {Schedule} schedule1 - 첫 번째 일정
     * @param {Schedule} schedule2 - 두 번째 일정
     * @param {Session} session - 확인할 세션
     * @returns {boolean} 충돌이 있으면 true
     */
    hasTimeConflict(schedule1, schedule2, session) {
        // 현재 구현에서는 한 세션에 한 명만 배치하므로 충돌 없음
        return false;
    }

    /**
     * 배치 결과 통계 계산
     * 
     * 다양한 관점에서 배치 결과를 분석합니다:
     * - 전체 배치율
     * - 우선순위별 배치 현황
     * - 세션별 활용도
     * 
     * @returns {Object} 상세 통계 정보
     */
    getAssignmentStatistics() {
        const stats = {
            totalSchedules: 0,
            assignedSchedules: 0,
            totalSessions: 0,
            usedSessions: 0,
            utilizationByPriority: new Map(),
            sessionUtilization: []
        };

        const participants = this.dataStore.getAllParticipants();
        const sessions = this.dataStore.getAllSessions();

        stats.totalSchedules = schedules.length;
        stats.totalSessions = sessions.filter(s => s.enabled).length;

        // 우선순위별 통계
        schedules.forEach(schedule => {
            const priority = schedule.priority;
            if (!stats.utilizationByPriority.has(priority)) {
                stats.utilizationByPriority.set(priority, { total: 0, assigned: 0 });
            }
            
            const priorityStats = stats.utilizationByPriority.get(priority);
            priorityStats.total++;
            
            if (schedule.assignedSession) {
                stats.assignedSchedules++;
                priorityStats.assigned++;
            }
        });

        // 세션별 통계
        sessions.forEach(session => {
            if (session.enabled) {
                const utilization = {
                    sessionId: session.id,
                    sessionName: session.name,
                    capacity: 1,
                    used: session.assignedSchedules.length,
                    utilization: session.assignedSchedules.length * 100
                };
                
                stats.sessionUtilization.push(utilization);
                
                if (session.assignedSchedules.length > 0) {
                    stats.usedSessions++;
                }
            }
        });

        return stats;
    }

    /**
     * 배치 개선 제안 생성
     * 
     * 현재 배치 상태를 분석하여 사용자에게 유용한 개선 제안을 생성합니다:
     * - 미배치 일정에 대한 해결책 제안
     * - 미사용 세션에 대한 활용 방안 제안
     * 
     * @returns {Array} 제안 목록
     */
    generateSuggestions() {
        const suggestions = [];
        const unassignedParticipants = this.dataStore.getAllParticipants().filter(p => !p.assignedSession);
        const underutilizedSessions = this.dataStore.getAllSessions().filter(s => 
            s.enabled && s.assignedSchedules.length === 0
        );

        // 미배치 일정에 대한 제안
        unassignedSchedules.forEach(schedule => {
            const possibleSessions = this.dataStore.getAllSessions().filter(session =>
                !this.canAssignToSession(schedule, session) && session.enabled
            );

            if (possibleSessions.length > 0) {
                suggestions.push({
                    type: 'schedule_time_conflict',
                    message: `"${schedule.name}" 일정이 현재 세션 시간과 맞지 않습니다. 일정의 가능 시간을 조정하거나 새 세션을 추가해보세요.`,
                    schedule: schedule,
                    possibleSessions: possibleSessions
                });
            }
        });

        // 미사용 세션에 대한 제안
        underutilizedSessions.forEach(session => {
            suggestions.push({
                type: 'unused_session',
                message: `"${session.name}" 세션이 사용되지 않고 있습니다. 이 시간대에 가능한 일정을 추가하거나 세션을 비활성화하세요.`,
                session: session
            });
        });

        return suggestions;
    }

    /**
     * 배치 최적화 점수 계산
     * 
     * 배치 품질을 정량적으로 평가하는 종합 점수를 계산합니다.
     * 
     * 평가 기준 (총 100점):
     * - 전체 배치율 (40점): 얼마나 많은 일정이 배치되었는가
     * - 세션 활용률 (30점): 얼마나 많은 세션이 활용되었는가  
     * - 우선순위 준수율 (30점): 높은 우선순위 일정이 우선 배치되었는가
     * 
     * @returns {Object} 점수 및 세부 분석 정보
     */
    calculateOptimizationScore() {
        const stats = this.getAssignmentStatistics();
        
        let score = 0;
        let maxScore = 0;

        // 전체 배치율 (40점)
        const assignmentRate = stats.totalSchedules > 0 ? 
            (stats.assignedSchedules / stats.totalSchedules) : 0;
        score += assignmentRate * 40;
        maxScore += 40;

        // 세션 활용률 (30점)
        const sessionUtilization = stats.totalSessions > 0 ?
            (stats.usedSessions / stats.totalSessions) : 0;
        score += sessionUtilization * 30;
        maxScore += 30;

        // 우선순위 준수율 (30점)
        let priorityScore = 0;
        let totalWeightedSchedules = 0;
        let assignedWeightedSchedules = 0;

        stats.utilizationByPriority.forEach((value, priority) => {
            totalWeightedSchedules += value.total * priority;
            assignedWeightedSchedules += value.assigned * priority;
        });

        if (totalWeightedSchedules > 0) {
            priorityScore = (assignedWeightedSchedules / totalWeightedSchedules) * 30;
        }
        score += priorityScore;
        maxScore += 30;

        return {
            score: Math.round(score),
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100),
            details: {
                assignmentRate: Math.round(assignmentRate * 100),
                sessionUtilization: Math.round(sessionUtilization * 100),
                priorityCompliance: Math.round((priorityScore / 30) * 100)
            }
        };
    }
}

// 전역 스케줄러 인스턴스 생성
// TimeTetrisApp이 로드된 후 자동으로 스케줄러를 초기화합니다.
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.dataStore) {
        window.app.scheduler = new Scheduler(window.app.dataStore);
    }
});