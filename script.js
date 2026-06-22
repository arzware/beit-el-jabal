const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const glow = document.querySelector('.cursor-glow');

const setHeaderState = () => {
  header?.classList.toggle('scrolled', window.scrollY > 16);
};
setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

menuToggle?.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

if (glow) {
  window.addEventListener('pointermove', (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

// Booking configuration
const bookingConfig = {
  calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID || '',
  apiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '96181801907',
  webhookUrl: import.meta.env.VITE_BOOKING_WEBHOOK_URL || '',
};

console.log('--- Vite Env Debug ---');
console.log('Calendar ID configured:', !!bookingConfig.calendarId);
console.log('API Key configured:', !!bookingConfig.apiKey);
console.log('WhatsApp Number configured:', !!bookingConfig.whatsappNumber);
console.log('Webhook URL configured:', !!bookingConfig.webhookUrl);
console.log('----------------------');

const bookingEls = {
  source: document.querySelector('[data-availability-source]'),
  status: document.querySelector('[data-booking-status]'),
  slots: document.querySelector('[data-slots]'),
  dateSelector: document.querySelector('[data-date-selector]'),
  dateSelect: document.querySelector('[data-date-select]'),
  form: document.querySelector('[data-booking-form]'),
  selectedSlot: document.querySelector('[data-selected-slot]'),
  error: document.querySelector('[data-form-error]'),
};

document.querySelector('a[href="#booking"]')?.addEventListener('click', () => {
  console.log('Check availability button clicked');
});

let selectedSlot = null;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const getDateKey = (dateObj) => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const getNextWeekday = (weekdayIndex) => {
  const now = new Date();
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  const daysUntil = (weekdayIndex - result.getDay() + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
};

const createDateAtTime = (baseDate, hour, minute = 0) => {
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const getEventDate = (eventDate) => {
  if (!eventDate) return null;
  const value = eventDate.dateTime || eventDate.date;
  return value ? new Date(value) : null;
};

const fetchBusyEvents = async () => {
  if (!bookingConfig.calendarId || !bookingConfig.apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const params = new URLSearchParams({
    key: bookingConfig.apiKey,
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: now.toISOString(),
    timeMax: thirtyDaysFromNow.toISOString(),
    maxResults: '250',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(bookingConfig.calendarId)}/events?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar fetch error details:', errorText);
    throw new Error(`Google Calendar request failed with ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []).map(event => ({
    start: getEventDate(event.start),
    end: getEventDate(event.end)
  })).filter(e => e.start && e.end);
};

const generateLocalSlots = () => {
  const slots = [];
  const now = new Date();
  
  for (let i = 0; i < 30; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    
    const fullDayStart = createDateAtTime(day, 10, 0);
    const fullDayEnd = createDateAtTime(day, 18, 0);
    if (fullDayStart > now) {
      slots.push({ type: 'Full day', start: fullDayStart, end: fullDayEnd });
    }
    
    const morningStart = createDateAtTime(day, 10, 0);
    const morningEnd = createDateAtTime(day, 14, 0);
    if (morningStart > now) {
      slots.push({ type: 'Morning half-day', start: morningStart, end: morningEnd });
    }
    
    const afternoonStart = createDateAtTime(day, 14, 0);
    const afternoonEnd = createDateAtTime(day, 18, 0);
    if (afternoonStart > now) {
      slots.push({ type: 'Afternoon half-day', start: afternoonStart, end: afternoonEnd });
    }
  }
  return slots;
};

const isOverlapping = (slot, busyEvents) => {
  return busyEvents.some(busy => {
    return slot.start < busy.end && slot.end > busy.start;
  });
};

const getAvailableSlots = async () => {
  console.log('Generating local slots...');
  const localSlots = generateLocalSlots();
  console.log(`Generated ${localSlots.length} local slots.`);
  
  try {
    console.log('Calendar fetch started...');
    const busyEvents = await fetchBusyEvents();
    console.log(`Calendar fetch success. Number of busy events found: ${busyEvents.length}`);
    
    const availableSlots = localSlots.filter(slot => !isOverlapping(slot, busyEvents));
    console.log(`Filtering complete. Number of available slots generated: ${availableSlots.length}`);
    
    return {
      slots: availableSlots,
      source: 'Google Calendar'
    };
  } catch (error) {
    if (error.message === 'API_KEY_MISSING') {
       throw error;
    }
    console.error('Calendar Fetch Error:', error);
    throw new Error('FAILED_TO_FETCH');
  }
};

const showStatus = (message, state = 'info') => {
  if (!bookingEls.status) return;
  bookingEls.status.textContent = message;
  bookingEls.status.dataset.state = state;
  bookingEls.status.hidden = false;
};

const hideStatus = () => {
  if (bookingEls.status) bookingEls.status.hidden = true;
};

const renderSelectedSlot = (slot) => {
  if (!bookingEls.selectedSlot) return;
  bookingEls.selectedSlot.innerHTML = `
    <span>Selected slot</span>
    <strong>${slot.type}</strong>
    <small>${dateFormatter.format(slot.start)} • ${timeFormatter.format(slot.start)} - ${timeFormatter.format(slot.end)}</small>
  `;
};

const selectSlot = (slot, button) => {
  selectedSlot = slot;
  document.querySelectorAll('.slot-card.selected').forEach((card) => card.classList.remove('selected'));
  button.closest('.slot-card')?.classList.add('selected');
  bookingEls.form.hidden = false;
  bookingEls.error.textContent = '';
  renderSelectedSlot(slot);
  bookingEls.form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

let allAvailableSlots = [];
let slotsByDate = {};

const renderDateSelector = (slots) => {
  console.log(`renderDateSelector called with ${slots.length} slots.`);
  if (!bookingEls.dateSelect) return;
  
  allAvailableSlots = slots;
  slotsByDate = {};
  
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    slotsByDate[getDateKey(day)] = [];
  }
  
  slots.forEach(slot => {
    const key = getDateKey(slot.start);
    if (slotsByDate[key]) {
      slotsByDate[key].push(slot);
    }
  });

  bookingEls.dateSelect.innerHTML = '';
  let firstAvailableKey = null;

  Object.keys(slotsByDate).forEach(key => {
    const daySlots = slotsByDate[key];
    const dateParts = key.split('-');
    // Create date safely without timezone shifting issues:
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]); 
    const formattedDate = dateFormatter.format(dateObj);
    
    const option = document.createElement('option');
    option.value = key;
    
    if (daySlots.length === 0) {
      option.textContent = `${formattedDate} — Fully booked`;
      option.disabled = true;
    } else {
      option.textContent = formattedDate;
      if (!firstAvailableKey) firstAvailableKey = key;
    }
    
    bookingEls.dateSelect.appendChild(option);
  });

  if (!firstAvailableKey) {
    showStatus('No available slots in the next 30 days. Please contact us on WhatsApp.', 'empty');
    bookingEls.dateSelector.hidden = true;
    bookingEls.slots.innerHTML = '';
    return;
  }

  hideStatus();
  bookingEls.dateSelector.hidden = false;
  bookingEls.dateSelect.value = firstAvailableKey;
  renderSlotsForDate(firstAvailableKey);
};

const renderSlotsForDate = (dateKey) => {
  const slots = slotsByDate[dateKey] || [];
  if (!bookingEls.slots) return;
  bookingEls.slots.innerHTML = '';
  
  bookingEls.form.hidden = true;
  selectedSlot = null;

  if (!slots.length) return;

  const fragment = document.createDocumentFragment();

  slots.forEach((slot) => {
    const card = document.createElement('article');
    card.className = 'slot-card';
    card.innerHTML = `
      <div class="slot-date">
        <span>${dateFormatter.format(slot.start)}</span>
      </div>
      <h4>${slot.type}</h4>
      <p>${timeFormatter.format(slot.start)} - ${timeFormatter.format(slot.end)}</p>
      <button class="button ghost" type="button">Select this slot</button>
    `;
    card.querySelector('button').addEventListener('click', (event) => selectSlot(slot, event.currentTarget));
    fragment.append(card);
  });

  bookingEls.slots.append(fragment);
};

bookingEls.dateSelect?.addEventListener('change', (e) => {
  renderSlotsForDate(e.target.value);
});

const buildWhatsAppMessage = (formData) => {
  const guests = formData.get('guests')?.trim() || 'Not specified';
  const message = formData.get('message')?.trim() || 'No special request';

  return `Hello, I want to book Beit El Jabal.\nThis is a booking request and final confirmation is by WhatsApp.\n\nDate: ${dateFormatter.format(selectedSlot.start)}\nSlot: ${selectedSlot.type}\nTime: ${timeFormatter.format(selectedSlot.start)} - ${timeFormatter.format(selectedSlot.end)}\nName: ${formData.get('fullName').trim()}\nPhone: ${formData.get('phone').trim()}\nGuests: ${guests}\nNotes: ${message}`;
};

bookingEls.form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  bookingEls.error.innerHTML = '';

  if (!selectedSlot) {
    bookingEls.error.textContent = 'Please select an available slot first.';
    return;
  }

  const formData = new FormData(bookingEls.form);
  const fullName = formData.get('fullName')?.trim();
  const phone = formData.get('phone')?.trim();
  const guests = formData.get('guests')?.trim() || 'Not specified';
  const message = formData.get('message')?.trim() || 'No special request';

  if (!fullName || !phone) {
    bookingEls.error.textContent = 'Full name and phone number are required.';
    return;
  }

  const submitButton = bookingEls.form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(buildWhatsAppMessage(formData));
    const url = `https://wa.me/${bookingConfig.whatsappNumber}?text=${encodedMessage}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!bookingConfig.webhookUrl) {
    openWhatsApp();
    return;
  }

  submitButton.textContent = 'Registering booking...';
  submitButton.disabled = true;

  const payload = {
    name: fullName,
    phone: phone,
    guests: guests,
    notes: message,
    date: dateFormatter.format(selectedSlot.start),
    slotLabel: selectedSlot.type,
    start: selectedSlot.start.toISOString(),
    end: selectedSlot.end.toISOString(),
    calendarId: bookingConfig.calendarId
  };

  try {
    const response = await fetch(bookingConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!result.success) {
      if (result.error === 'Slot is no longer available') {
        bookingEls.error.innerHTML = `Sorry, this slot was just taken. Please choose another time or <a href="https://wa.me/${bookingConfig.whatsappNumber}" target="_blank" style="color: inherit; text-decoration: underline;">contact us on WhatsApp</a>.`;
        return;
      } else {
        console.error('Webhook error:', result.error);
        openWhatsApp();
      }
    } else {
      console.log('Pending booking added to calendar.', result.eventId);
      openWhatsApp();
      initBooking();
    }
  } catch (error) {
    console.error('WhatsApp request opened, but calendar pending event was not created.', error);
    openWhatsApp();
  } finally {
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
  }
});

const initBooking = async () => {
  if (!bookingEls.slots) return;
  showStatus('Loading available times...', 'loading');

  try {
    const { slots, source } = await getAvailableSlots();
    if (bookingEls.source) bookingEls.source.textContent = source;
    renderDateSelector(slots);
  } catch (error) {
    console.error('initBooking error caught:', error);
    if (bookingEls.source) bookingEls.source.textContent = 'WhatsApp fallback';
    bookingEls.slots.innerHTML = '';
    if (error.message === 'API_KEY_MISSING') {
      showStatus('Availability is not connected yet. Please contact us on WhatsApp.', 'error');
    } else {
      showStatus(`Could not load availability: ${error.message}. Please contact us on WhatsApp.`, 'error');
    }
  }
};

initBooking();
