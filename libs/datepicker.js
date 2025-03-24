/**
 * Simple Date Picker
 * Простой календарь для выбора даты, работающий без подключения к интернету
 */
class SimpleDatePicker {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = Object.assign({
      dateFormat: "dd.mm.yyyy",
      monthNames: [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
      ],
      weekDays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      firstDay: 1, // 0 - Sunday, 1 - Monday
      todayText: "Сегодня",
      closeText: "Закрыть",
      yearRange: 10, // Years to show in selector
      onSelect: null // Callback when date is selected
    }, options);
    
    this.isOpen = false;
    this.currentDate = new Date();
    this.selectedDate = null;
    
    // Create datepicker elements
    this.createElements();
    
    // Add event listeners
    this.addEventListeners();
  }
  
  createElements() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'simple-datepicker';
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
    
    // Header with month/year navigation
    const header = document.createElement('div');
    header.className = 'datepicker-header';
    
    this.prevMonthBtn = document.createElement('button');
    this.prevMonthBtn.innerHTML = '&larr;';
    this.prevMonthBtn.className = 'datepicker-nav';
    header.appendChild(this.prevMonthBtn);
    
    this.monthYearDisplay = document.createElement('div');
    this.monthYearDisplay.className = 'datepicker-month-year';
    header.appendChild(this.monthYearDisplay);
    
    this.nextMonthBtn = document.createElement('button');
    this.nextMonthBtn.innerHTML = '&rarr;';
    this.nextMonthBtn.className = 'datepicker-nav';
    header.appendChild(this.nextMonthBtn);
    
    this.container.appendChild(header);
    
    // Calendar body
    this.calendarBody = document.createElement('div');
    this.calendarBody.className = 'datepicker-body';
    this.container.appendChild(this.calendarBody);
    
    // Footer with today and close buttons
    const footer = document.createElement('div');
    footer.className = 'datepicker-footer';
    
    this.todayBtn = document.createElement('button');
    this.todayBtn.textContent = this.options.todayText;
    this.todayBtn.className = 'datepicker-btn';
    footer.appendChild(this.todayBtn);
    
    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = this.options.closeText;
    this.closeBtn.className = 'datepicker-btn';
    footer.appendChild(this.closeBtn);
    
    this.container.appendChild(footer);
    
    // Add styles
    this.addStyles();
  }
  
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .simple-datepicker {
        position: absolute;
        z-index: 1000;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        width: 300px;
        font-family: Arial, sans-serif;
        user-select: none;
      }
      .datepicker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
      }
      .datepicker-month-year {
        font-weight: bold;
        text-align: center;
        flex-grow: 1;
      }
      .datepicker-nav {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 5px 10px;
        color: #333;
      }
      .datepicker-nav:hover {
        background-color: #f0f0f0;
        border-radius: 4px;
      }
      .datepicker-body {
        padding: 10px;
      }
      .datepicker-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .datepicker-weekday {
        text-align: center;
        font-weight: bold;
        padding: 8px 0;
        color: #555;
      }
      .datepicker-day {
        text-align: center;
        padding: 8px 0;
        cursor: pointer;
        border-radius: 4px;
      }
      .datepicker-day:hover {
        background-color: #f0f0f0;
      }
      .datepicker-day.other-month {
        color: #aaa;
      }
      .datepicker-day.today {
        font-weight: bold;
        border: 1px solid #ccc;
      }
      .datepicker-day.selected {
        background-color: #4a90e2;
        color: white;
      }
      .datepicker-footer {
        padding: 10px;
        text-align: center;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
      }
      .datepicker-btn {
        background-color: #f0f0f0;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
      }
      .datepicker-btn:hover {
        background-color: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
  }
  
  addEventListeners() {
    // Toggle datepicker when clicking on the input
    this.input.addEventListener('click', () => this.toggle());
    
    // Navigation buttons
    this.prevMonthBtn.addEventListener('click', () => this.prevMonth());
    this.nextMonthBtn.addEventListener('click', () => this.nextMonth());
    
    // Footer buttons
    this.todayBtn.addEventListener('click', () => this.selectToday());
    this.closeBtn.addEventListener('click', () => this.close());
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          e.target !== this.input && 
          !this.container.contains(e.target)) {
        this.close();
      }
    });
    
    // Handle input changes to parse entered dates
    this.input.addEventListener('change', () => this.parseInputDate());
    this.input.addEventListener('blur', () => this.validateInputDate());
  }
  
  parseInputDate() {
    const value = this.input.value;
    if (!value) return;
    
    const parts = value.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        if (this.isValidDate(date)) {
          this.selectedDate = date;
          this.currentDate = new Date(date);
        }
      }
    }
  }
  
  validateInputDate() {
    if (!this.input.value) return;
    
    if (this.selectedDate) {
      this.input.value = this.formatDate(this.selectedDate);
    } else {
      this.input.value = '';
    }
  }
  
  isValidDate(date) {
    return date instanceof Date && !isNaN(date);
  }
  
  open() {
    if (this.isOpen) return;
    
    this.parseInputDate();
    this.render();
    
    // Position the datepicker below the input
    const rect = this.input.getBoundingClientRect();
    this.container.style.top = (rect.bottom + window.scrollY) + 'px';
    this.container.style.left = (rect.left + window.scrollX) + 'px';
    
    this.container.style.display = 'block';
    this.isOpen = true;
  }
  
  close() {
    this.container.style.display = 'none';
    this.isOpen = false;
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  render() {
    // Update month/year display
    this.monthYearDisplay.textContent = `${this.options.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    
    // Clear and rebuild calendar body
    this.calendarBody.innerHTML = '';
    
    // Create weekday headers
    const daysGrid = document.createElement('div');
    daysGrid.className = 'datepicker-days';
    
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + this.options.firstDay) % 7;
      const weekdayEl = document.createElement('div');
      weekdayEl.className = 'datepicker-weekday';
      weekdayEl.textContent = this.options.weekDays[dayIndex];
      daysGrid.appendChild(weekdayEl);
    }
    
    // Get first day of the month
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Calculate days from previous month to show
    let firstDayOfGrid = new Date(firstDay);
    const dayOfWeek = (firstDay.getDay() + 7 - this.options.firstDay) % 7;
    firstDayOfGrid.setDate(firstDay.getDate() - dayOfWeek);
    
    // Create days grid (6 weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    let currentDate = new Date(firstDayOfGrid);
    
    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'datepicker-day';
      dayEl.textContent = currentDate.getDate();
      
      // Check if day is from another month
      if (currentDate.getMonth() !== month) {
        dayEl.classList.add('other-month');
      }
      
      // Check if day is today
      if (currentDate.getTime() === todayTime) {
        dayEl.classList.add('today');
      }
      
      // Check if day is selected
      if (this.selectedDate && 
          currentDate.getDate() === this.selectedDate.getDate() && 
          currentDate.getMonth() === this.selectedDate.getMonth() && 
          currentDate.getFullYear() === this.selectedDate.getFullYear()) {
        dayEl.classList.add('selected');
      }
      
      // Store date data and add click event
      const dateValue = new Date(currentDate);
      dayEl.addEventListener('click', () => this.selectDate(dateValue));
      
      daysGrid.appendChild(dayEl);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    this.calendarBody.appendChild(daysGrid);
  }
  
  selectDate(date) {
    this.selectedDate = date;
    this.input.value = this.formatDate(date);
    
    // Trigger callback if exists
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(date, this.formatDate(date));
    }
    
    this.render();
    this.close();
  }
  
  formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  }
  
  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.render();
  }
  
  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.render();
  }
  
  selectToday() {
    this.selectDate(new Date());
  }
}

// Expose globally
window.SimpleDatePicker = SimpleDatePicker;
