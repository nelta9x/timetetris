/**
 * CustomCalendar 클래스
 * 
 * TimeTetris 애플리케이션을 위한 커스텀 캘린더 구현입니다.
 * FullCalendar를 대체하는 가볍고 빠른 캘린더로, 드래그 앤 드롭을 지원합니다.
 * 
 * 주요 기능:
 * - 일간/주간/월간 뷰 전환
 * - 세션과 일정 표시
 * - 드래그 앤 드롭으로 시간 변경 및 배치
 * - 모바일 반응형 디자인
 * - Lucide 아이콘 통합
 */
class CustomCalendar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        this.options = {
            view: 'week', // 'day', 'week', 'month'
            locale: 'ko-KR',
            onEventClick: null,
            onEventDrop: null,
            onDateChange: null,
            ...options
        };

        // 현재 날짜를 테스트 데이터 날짜로 설정 (임시)
        this.currentDate = new Date('2025-09-07T12:00:00');
        this.events = [];
        this.draggedElement = null;
        this.draggedData = null;

        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.updateDateDisplay();
    }
    
    // ========================
    // 렌더링 메서드
    // ========================
    
    render() {
        this.container.innerHTML = '';
        
        switch(this.options.view) {
            case 'day':
                this.renderDayView();
                break;
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
            default:
                this.renderWeekView();
                break;
        }
        
        // Lucide 아이콘 초기화
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    renderWeekView() {
        const weekStart = this.getWeekStart(this.currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const container = document.createElement('div');
        container.className = 'calendar-week-view';
        
        // 헤더 생성
        const header = this.createWeekHeader(weekStart);
        container.appendChild(header);
        
        // 시간 그리드 생성
        const grid = this.createTimeGrid(weekStart);
        container.appendChild(grid);
        
        this.container.appendChild(container);
        
        // 이벤트 렌더링
        this.renderEventsInWeekView();
    }
    
    createWeekHeader(weekStart) {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        
        // 빈 시간 라벨 칸
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = '시간';
        header.appendChild(timeLabel);
        
        // 요일 헤더들
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            
            // 오늘 날짜 강조
            const isToday = date.getTime() === today.getTime();
            if (isToday) {
                dayHeader.classList.add('today');
            }
            
            dayHeader.innerHTML = `
                <div class="day-name">${dayNames[date.getDay()]}</div>
                <div class="day-date">${date.getDate()}</div>
            `;
            dayHeader.dataset.date = this.formatDate(date);
            
            header.appendChild(dayHeader);
        }
        
        return header;
    }
    
    createTimeGrid(weekStart) {
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        
        // 24시간 그리드 생성
        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('div');
            row.className = 'time-row';
            
            // 시간 라벨
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label-cell';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            row.appendChild(timeLabel);
            
            // 각 요일의 시간 슬롯
            for (let day = 0; day < 7; day++) {
                const slot = document.createElement('div');
                slot.className = 'time-slot';
                
                const slotDate = new Date(weekStart);
                slotDate.setDate(slotDate.getDate() + day);
                slotDate.setHours(hour, 0, 0, 0);
                
                slot.dataset.datetime = slotDate.toISOString();
                slot.dataset.hour = hour;
                slot.dataset.day = day;
                
                // 드롭 영역 이벤트
                slot.addEventListener('dragover', this.handleDragOver.bind(this));
                slot.addEventListener('drop', this.handleDrop.bind(this));
                slot.addEventListener('dragleave', this.handleDragLeave.bind(this));
                
                row.appendChild(slot);
            }
            
            grid.appendChild(row);
        }
        
        return grid;
    }
    
    renderEventsInWeekView() {
        const weekStart = this.getWeekStart(this.currentDate);

        this.events.forEach(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);

            // 이번 주에 속하는 이벤트만 표시
            if (this.isEventInWeek(event, weekStart)) {
                this.createEventElement(event, weekStart);
            }
        });
    }
    
    createEventElement(event, weekStart) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // 이벤트 시작 날짜와 주 시작 날짜의 차이 계산
        const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
        const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());

        // 날짜 차이 계산 (일 단위)
        const dayDiff = Math.floor((eventStartDate - weekStartDate) / (1000 * 60 * 60 * 24));

        // dayDiff가 0-6 범위를 벗어나면 표시하지 않음
        if (dayDiff < 0 || dayDiff > 6) {
            return;
        }

        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const duration = (eventEnd - eventStart) / (1000 * 60 * 60); // 시간 단위

        // 해당 시간 슬롯 찾기
        const slot = this.container.querySelector(
            `.time-slot[data-hour="${startHour}"][data-day="${dayDiff}"]`
        );

        if (!slot) {
            return;
        }
        
        // 이벤트 엘리먼트 생성
        const eventEl = document.createElement('div');
        eventEl.className = `calendar-event ${event.type}`;
        
        if (event.type === 'session' && event.assignedSchedules?.length > 0) {
            eventEl.classList.add('has-schedule');
        }
        
        // 위치와 크기 설정
        const top = (startMinute / 60) * 60; // 60px = 1시간
        const height = duration * 60; // 60px = 1시간
        
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        
        // 이벤트 내용
        eventEl.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-time">${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)}</div>
        `;
        
        // 배치된 일정이 있으면 표시
        if (event.type === 'session' && event.assignedSchedules?.length > 0) {
            event.assignedSchedules.forEach(schedule => {
                const scheduleEl = document.createElement('div');
                scheduleEl.className = 'schedule-in-session';
                scheduleEl.textContent = schedule.name;
                scheduleEl.dataset.scheduleId = schedule.id;
                scheduleEl.dataset.sessionId = event.id;
                
                // 일정 드래그 설정
                scheduleEl.draggable = true;
                scheduleEl.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    this.handleScheduleDragStart(e, schedule, event);
                });
                
                eventEl.appendChild(scheduleEl);
            });
        }
        
        // 이벤트 데이터 저장
        eventEl.dataset.eventId = event.id;
        eventEl.dataset.eventType = event.type;
        eventEl.dataset.eventData = JSON.stringify(event);
        
        // 드래그 설정 (세션만)
        if (event.type === 'session') {
            eventEl.draggable = true;
            eventEl.addEventListener('dragstart', (e) => this.handleDragStart(e, event));
        }
        
        // 클릭 이벤트
        eventEl.addEventListener('click', (e) => {
            if (this.options.onEventClick) {
                this.options.onEventClick(event, e);
            }
        });
        
        slot.appendChild(eventEl);
    }
    
    renderDayView() {
        const container = document.createElement('div');
        container.className = 'calendar-day-view';
        
        // 시간 라벨 컬럼
        const timeColumn = document.createElement('div');
        timeColumn.className = 'time-column';
        
        for (let hour = 0; hour < 24; hour++) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label-cell';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            timeColumn.appendChild(timeLabel);
        }
        
        container.appendChild(timeColumn);
        
        // 일간 컬럼
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        for (let hour = 0; hour < 24; hour++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            
            const slotDate = new Date(this.currentDate);
            slotDate.setHours(hour, 0, 0, 0);
            
            slot.dataset.datetime = slotDate.toISOString();
            slot.dataset.hour = hour;
            
            slot.addEventListener('dragover', this.handleDragOver.bind(this));
            slot.addEventListener('drop', this.handleDrop.bind(this));
            slot.addEventListener('dragleave', this.handleDragLeave.bind(this));
            
            dayColumn.appendChild(slot);
        }
        
        container.appendChild(dayColumn);
        this.container.appendChild(container);
        
        // 이벤트 렌더링
        this.renderEventsInDayView();
    }
    
    renderEventsInDayView() {
        const dayStart = new Date(this.currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        this.events.forEach(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            
            if (eventStart < dayEnd && eventEnd > dayStart) {
                this.createDayEventElement(event);
            }
        });
    }
    
    createDayEventElement(event) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const duration = (eventEnd - eventStart) / (1000 * 60 * 60);
        
        const slot = this.container.querySelector(`.time-slot[data-hour="${startHour}"]`);
        if (!slot) return;
        
        const eventEl = document.createElement('div');
        eventEl.className = `calendar-event ${event.type}`;
        
        const top = (startMinute / 60) * 60;
        const height = duration * 60;
        
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        
        eventEl.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-time">${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)}</div>
        `;
        
        eventEl.dataset.eventId = event.id;
        eventEl.dataset.eventType = event.type;
        
        if (event.type === 'session') {
            eventEl.draggable = true;
            eventEl.addEventListener('dragstart', (e) => this.handleDragStart(e, event));
        }
        
        eventEl.addEventListener('click', (e) => {
            if (this.options.onEventClick) {
                this.options.onEventClick(event, e);
            }
        });
        
        slot.appendChild(eventEl);
    }
    
    renderMonthView() {
        const container = document.createElement('div');
        container.className = 'calendar-month-view';
        
        // 요일 헤더
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayNames.forEach(day => {
            const header = document.createElement('div');
            header.className = 'month-day-header';
            header.textContent = day;
            container.appendChild(header);
        });
        
        // 월의 날짜들
        const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        // 첫 주의 시작 (일요일)
        const calendarStart = new Date(monthStart);
        calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
        
        // 마지막 주의 끝 (토요일)
        const calendarEnd = new Date(monthEnd);
        calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let date = new Date(calendarStart); date <= calendarEnd; date.setDate(date.getDate() + 1)) {
            const dayEl = document.createElement('div');
            dayEl.className = 'month-day';
            
            if (date.getMonth() !== this.currentDate.getMonth()) {
                dayEl.classList.add('other-month');
            }
            
            if (date.getTime() === today.getTime()) {
                dayEl.classList.add('today');
            }
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'month-day-number';
            dayNumber.textContent = date.getDate();
            dayEl.appendChild(dayNumber);
            
            // 이 날짜의 이벤트들
            const dayEvents = this.getEventsForDate(new Date(date));
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = `month-event ${event.type}`;
                eventEl.textContent = event.title;
                eventEl.addEventListener('click', () => {
                    if (this.options.onEventClick) {
                        this.options.onEventClick(event);
                    }
                });
                dayEl.appendChild(eventEl);
            });
            
            container.appendChild(dayEl);
        }
        
        this.container.appendChild(container);
    }
    
    // ========================
    // 드래그 앤 드롭 핸들러
    // ========================
    
    handleDragStart(e, event) {
        this.draggedElement = e.target;
        this.draggedData = event;
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
        
        // 고스트 이미지 생성
        const ghost = e.target.cloneNode(true);
        ghost.classList.add('drag-ghost');
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 50, 20);
        
        setTimeout(() => {
            document.body.removeChild(ghost);
        }, 0);
    }
    
    handleScheduleDragStart(e, schedule, session) {
        this.draggedElement = e.target;
        this.draggedData = {
            type: 'schedule',
            schedule: schedule,
            fromSession: session
        };
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drop-active');
        
        return false;
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drop-active');
    }
    
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        e.currentTarget.classList.remove('drop-active');
        
        if (this.draggedElement && this.draggedData) {
            const targetSlot = e.currentTarget;
            const newDatetime = new Date(targetSlot.dataset.datetime);
            
            if (this.draggedData.type === 'schedule') {
                // 일정을 다른 세션으로 이동
                this.handleScheduleDrop(targetSlot, newDatetime);
            } else {
                // 세션 시간 변경
                this.handleSessionDrop(targetSlot, newDatetime);
            }
        }
        
        return false;
    }
    
    handleSessionDrop(targetSlot, newDatetime) {
        const event = this.draggedData;
        const oldStart = new Date(event.start);
        const oldEnd = new Date(event.end);
        const duration = oldEnd - oldStart;
        
        event.start = newDatetime.toISOString();
        event.end = new Date(newDatetime.getTime() + duration).toISOString();
        
        if (this.options.onEventDrop) {
            this.options.onEventDrop(event, oldStart, newDatetime);
        }
        
        this.draggedElement.classList.remove('dragging');
        this.draggedElement = null;
        this.draggedData = null;
        
        this.render();
    }
    
    handleScheduleDrop(targetSlot, newDatetime) {
        // 타겟 슬롯에 세션이 있는지 확인
        const sessionEl = targetSlot.querySelector('.calendar-event.session');
        
        if (sessionEl) {
            const sessionData = JSON.parse(sessionEl.dataset.eventData);
            
            if (this.options.onScheduleDrop) {
                this.options.onScheduleDrop(
                    this.draggedData.schedule,
                    this.draggedData.fromSession,
                    sessionData
                );
            }
        }
        
        this.draggedElement.classList.remove('dragging');
        this.draggedElement = null;
        this.draggedData = null;
    }
    
    // ========================
    // 네비게이션 메서드
    // ========================
    
    navigate(direction) {
        switch(direction) {
            case 'prev':
                this.navigatePrev();
                break;
            case 'next':
                this.navigateNext();
                break;
            case 'today':
                this.currentDate = new Date();
                break;
        }
        
        this.render();
        this.updateDateDisplay();
        
        if (this.options.onDateChange) {
            this.options.onDateChange(this.currentDate);
        }
    }
    
    navigatePrev() {
        switch(this.options.view) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
    }
    
    navigateNext() {
        switch(this.options.view) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
    }
    
    // ========================
    // 뷰 전환
    // ========================
    
    changeView(view) {
        this.options.view = view;
        this.render();
        this.updateViewButtons();
    }
    
    updateViewButtons() {
        document.querySelectorAll('.view-switcher .btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === this.options.view) {
                btn.classList.add('active');
            }
        });
    }
    
    // ========================
    // 이벤트 관리
    // ========================
    
    setEvents(events) {
        this.events = events;
        this.render();
    }
    
    addEvent(event) {
        this.events.push(event);
        this.render();
    }
    
    updateEvent(eventId, updates) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            Object.assign(event, updates);
            this.render();
        }
    }
    
    removeEvent(eventId) {
        this.events = this.events.filter(e => e.id !== eventId);
        this.render();
    }
    
    // ========================
    // 유틸리티 메서드
    // ========================
    
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
    
    isEventInWeek(event, weekStart) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // 날짜만 비교하기 위해 시간 정보를 제거
        const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
        const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
        const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const weekEndDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());

        const isInWeek = eventStartDate < weekEndDate && eventEndDate > weekStartDate;

        return isInWeek;
    }
    
    getEventsForDate(date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        return this.events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            return eventStart < dayEnd && eventEnd > dayStart;
        });
    }
    
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatTime(date) {
        return date.toLocaleTimeString(this.options.locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    updateDateDisplay() {
        const display = document.getElementById('calendarCurrentDate');
        if (!display) return;
        
        let text = '';
        
        switch(this.options.view) {
            case 'day':
                text = this.currentDate.toLocaleDateString(this.options.locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                });
                break;
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                text = `${weekStart.toLocaleDateString(this.options.locale, {
                    month: 'short',
                    day: 'numeric'
                })} - ${weekEnd.toLocaleDateString(this.options.locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                })}`;
                break;
            case 'month':
                text = this.currentDate.toLocaleDateString(this.options.locale, {
                    year: 'numeric',
                    month: 'long'
                });
                break;
        }
        
        display.textContent = text;
    }
    
    attachEventListeners() {
        // 전역 드래그 종료 이벤트
        document.addEventListener('dragend', () => {
            if (this.draggedElement) {
                this.draggedElement.classList.remove('dragging');
                this.draggedElement = null;
                this.draggedData = null;
            }
            
            document.querySelectorAll('.drop-active').forEach(el => {
                el.classList.remove('drop-active');
            });
        });
    }
}

// 전역으로 내보내기
window.CustomCalendar = CustomCalendar;
