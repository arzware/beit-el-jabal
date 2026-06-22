function doPost(e) {
  try {
    // We expect the frontend to send text/plain containing JSON stringified payload
    // to bypass CORS preflight issues.
    var payload = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!payload.name || !payload.phone || !payload.start || !payload.end || !payload.slotLabel || !payload.calendarId) {
      return jsonResponse({ success: false, error: "Missing required fields" });
    }

    var calendar = CalendarApp.getCalendarById(payload.calendarId);
    if (!calendar) {
      return jsonResponse({ success: false, error: "Calendar not found or inaccessible" });
    }

    var startTime = new Date(payload.start);
    var endTime = new Date(payload.end);

    // Prevent duplicate overlap bookings
    var existingEvents = calendar.getEvents(startTime, endTime);
    if (existingEvents.length > 0) {
      return jsonResponse({ success: false, error: "Slot is no longer available" });
    }

    // Build the description
    var description = [
      "Name: " + payload.name,
      "Phone: " + payload.phone,
      "Guests: " + payload.guests,
      "Notes: " + payload.notes,
      "Selected date: " + payload.date,
      "Slot label: " + payload.slotLabel,
      "",
      "Source: Website booking request",
      "Status: Pending - confirm manually on WhatsApp"
    ].join("\n");

    // Create the event
    var title = "Pending Booking - " + payload.name;
    var event = calendar.createEvent(title, startTime, endTime, {
      description: description
    });

    // Mark as Busy explicitly
    if (event.setTransparency) {
      event.setTransparency(CalendarApp.EventTransparency.OPAQUE);
    }

    return jsonResponse({ success: true, eventId: event.getId() });

  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// Helper to handle CORS properly
function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Handle preflight OPTIONS request if the browser sends one
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
