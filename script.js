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
// Later, when you connect Google Calendar through a Vite build, place these in your deploy environment:
// VITE_GOOGLE_CALENDAR_ID=your_public_calendar_id
// VITE_GOOGLE_CALENDAR_API_KEY=your_browser_restricted_google_api_key
// VITE_WHATSAPP_NUMBER=81726020
// For this current static GitHub Pages version, you may also set window.BEIT_EL_JABAL_BOOKING before this script loads.
const viteEnv = import.meta.env || {};
const bookingConfig = {
  calendarId: window.BEIT_EL_JABAL_BOOKING?.calendarId || viteEnv.VITE_GOOGLE_CALENDAR_ID || '',
  apiKey: window.BEIT_EL_JABAL_BOOKING?.apiKey || viteEnv.VITE_GOOGLE_CALENDAR_API_KEY || '',
  whatsappNumber: window.BEIT_EL_JABAL_BOOKING?.whatsappNumber || viteEnv.VITE_WHATSAPP_NUMBER || '81726020',
};

const bookingEls = {
  source: document.querySelector('[data-availability-source]'),
  status: document.querySelector('[data-booking-status]'),
  slots: document.querySelector('[data-slots]'),
  form: document.querySelector('[data-booking-form]'),
  selectedSlot: document.querySelector('[data-selected-slot]'),
  error: document.querySelector('[data-form-error]'),
};

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

const getDemoSlots = () => {
  const friday = getNextWeekday(5);
  const saturday = getNextWeekday(6);

  return [
    {
      id: 'demo-full-day',
      title: 'Available - Full Day',
      type: 'Full Day',
      start: createDateAtTime(friday, 10),
      end: createDateAtTime(friday, 18),
      isDemo: true,
    },
    {
      id: 'demo-half-day-morning',
      title: 'Available - Half Day Morning',
      type: 'Half Day Morning',
      start: createDateAtTime(saturday, 10),
      end: createDateAtTime(saturday, 14),
      isDemo: true,
    },
    {
      id: 'demo-half-day-evening',
      title: 'Available - Half Day Evening',
      type: 'Half Day Evening',
      start: createDateAtTime(saturday, 15),
      end: createDateAtTime(saturday, 20),
      isDemo: true,
    },
  ];
};

const getEventDate = (eventDate) => {
  if (!eventDate) return null;
  const value = eventDate.dateTime || eventDate.date;
  return value ? new Date(value) : null;
};

const getBookingType = (title) => title.replace(/^Available\s*-?\s*/i, '').trim() || 'Available Slot';

const normalizeCalendarEvent = (event) => {
  const title = event.summary || '';
  return {
    id: event.id,
    title,
    type: getBookingType(title),
    start: getEventDate(event.start),
    end: getEventDate(event.end),
    isDemo: false,
  };
};

const fetchCalendarSlots = async () => {
  if (!bookingConfig.calendarId || !bookingConfig.apiKey) {
    return { slots: getDemoSlots(), source: 'Demo slots' };
  }

  const params = new URLSearchParams({
    key: bookingConfig.apiKey,
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: new Date().toISOString(),
    maxResults: '50',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(bookingConfig.calendarId)}/events?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Calendar request failed with ${response.status}`);
  }

  const data = await response.json();
  const now = new Date();
  const slots = (data.items || [])
    .map(normalizeCalendarEvent)
    .filter((slot) => slot.title.toLowerCase().startsWith('available'))
    .filter((slot) => slot.start && slot.end && slot.start > now)
    .sort((a, b) => a.start - b.start);

  return { slots, source: 'Google Calendar' };
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

const renderSlots = (slots) => {
  if (!bookingEls.slots) return;
  bookingEls.slots.innerHTML = '';

  if (!slots.length) {
    showStatus('No available times right now. Please contact us on WhatsApp.', 'empty');
    return;
  }

  hideStatus();
  const fragment = document.createDocumentFragment();

  slots.forEach((slot) => {
    const card = document.createElement('article');
    card.className = 'slot-card';
    card.innerHTML = `
      <div class="slot-date">
        <span>${dateFormatter.format(slot.start)}</span>
        ${slot.isDemo ? '<em>Demo</em>' : ''}
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

const buildWhatsAppMessage = (formData) => {
  const guests = formData.get('guests')?.trim() || 'Not specified';
  const message = formData.get('message')?.trim() || 'No special request';

  return `Hello Beit El Jabal, I would like to book:\n\nDate: ${dateFormatter.format(selectedSlot.start)}\nTime: ${timeFormatter.format(selectedSlot.start)} - ${timeFormatter.format(selectedSlot.end)}\nType: ${selectedSlot.type}\n\nName: ${formData.get('fullName').trim()}\nPhone: ${formData.get('phone').trim()}\nGuests: ${guests}\nMessage: ${message}\n\nIs this still available?`;
};

bookingEls.form?.addEventListener('submit', (event) => {
  event.preventDefault();
  bookingEls.error.textContent = '';

  if (!selectedSlot) {
    bookingEls.error.textContent = 'Please select an available slot first.';
    return;
  }

  const formData = new FormData(bookingEls.form);
  const fullName = formData.get('fullName')?.trim();
  const phone = formData.get('phone')?.trim();

  if (!fullName || !phone) {
    bookingEls.error.textContent = 'Full name and phone number are required.';
    return;
  }

  const encodedMessage = encodeURIComponent(buildWhatsAppMessage(formData));
  const url = `https://wa.me/${bookingConfig.whatsappNumber}?text=${encodedMessage}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

const initBooking = async () => {
  if (!bookingEls.slots) return;
  showStatus('Loading available times...', 'loading');

  try {
    const { slots, source } = await fetchCalendarSlots();
    if (bookingEls.source) bookingEls.source.textContent = source;
    renderSlots(slots);
  } catch (error) {
    console.error(error);
    if (bookingEls.source) bookingEls.source.textContent = 'WhatsApp fallback';
    bookingEls.slots.innerHTML = '';
    showStatus('Could not load availability. Please contact us on WhatsApp.', 'error');
  }
};

initBooking();
