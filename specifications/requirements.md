# Requirements Document

## Introduction

Ras Hotel is a cloud-based hospitality management and booking system designed for a single hotel entity operating in the Ethiopian market. The system replaces manual paper-based processes with a synchronized digital platform that supports online and walk-in bookings, localized mobile money payments via Chapa (TeleBirr, CBE Birr), QR-coded digital tickets for streamlined check-in, a RAG-based AI chatbot for 24/7 guest support, real-time room management and housekeeping status tracking, shift handover logging, daily revenue and occupancy reporting, and a comprehensive management dashboard for hotel staff and operations oversight.

The system serves four primary user personas: Remote Guests (online bookers), Walk-in Guests (reception-assisted), Receptionists (front-desk staff), and Hotel Managers (operations oversight). Every feature is designed around the real operational conditions of Ras Hotel in Harar, Ethiopia — including intermittent connectivity, cash-dominant payments, multilingual guests, and the need for clear staff accountability.

The full booking lifecycle is formally governed by the system: from initial reservation through payment, check-in, stay extension, check-out, and post-stay feedback. Cross-actor accountability is enforced at every cash collection and status transition point. The Manager can configure all hotel-wide operational parameters — including check-in/check-out times, no-show thresholds, and cancellation windows — without developer intervention. A unified audit log provides complete traceability of all staff actions across the system.

---

## Glossary

- **Booking_Engine**: The subsystem responsible for processing room reservations, availability checks, and booking confirmations.
- **Booking_Reference**: A unique alphanumeric identifier assigned to each confirmed booking, used for lookup, QR encoding, and guest communication.
- **Cancellation_Policy**: The hotel's time-based refund rules: cancellation more than 48 hours before check-in = full refund; cancellation within 48 hours of check-in = 50% refund; cancellation on check-in day or no-show = no refund.
- **No_Show**: A booking with a check-in date of the current day that has not been checked in by the hotel's defined no-show threshold time (default 20:00 local time).
- **Chatbot**: The AI-powered conversational assistant backed by a RAG (Retrieval-Augmented Generation) pipeline trained on hotel-specific documents.
- **Chapa_Gateway**: The third-party Ethiopian payment gateway integrating TeleBirr and CBE Birr mobile money services.
- **Check_In_Instructions**: A standardised message sent to a Guest after booking confirmation, containing the hotel address, what to bring for check-in, reception hours, and the Booking_Reference.
- **Dashboard**: The web-based staff interface used by Receptionists and Managers to view and manage bookings, room status, payments, and reports.
- **Document_Store**: The backend storage system holding hotel PDFs and FAQ documents used to train and update the Chatbot.
- **Guest**: Any person (remote or walk-in) who books or inquires about a room.
- **Guest_Profile**: A logical grouping of all booking records associated with a single phone number, including the guest's most recently submitted registration details (full name, age, sex, nationality) and their complete booking history across all stays.
- **Guest_Note**: A free-text annotation attached to a Guest_Profile by a Receptionist or Manager, recording preferences, complaints, VIP status, or other relevant observations.
- **Manager**: The hotel owner or operations manager with elevated system privileges.
- **Notification_Alert**: A real-time in-app banner or badge displayed on the Dashboard to inform Receptionists of new online bookings, cancellations, or other time-sensitive events.
- **Occupancy_Rate**: The percentage of available rooms that are occupied on a given date, calculated as (Occupied rooms ÷ Total active rooms) × 100.
- **PDF_Ticket**: A downloadable PDF document containing booking details and a QR code, issued to confirmed Guests.
- **QR_Scanner**: The interface used by Receptionists to scan a Guest's QR code and retrieve booking details.
- **Receptionist**: Front-desk hotel staff who manage walk-in bookings and guest check-ins via the Dashboard.
- **Revenue_Summary**: An aggregated financial report showing total cash collected, total mobile money collected, total bookings, and Occupancy_Rate for a specified date range.
- **Room**: A physical hotel room with a unique room number, type, floor, description, photos, and base price per night.
- **Room_Lock**: A temporary 10-minute reservation hold placed on a room when a Guest initiates the booking flow, preventing double-booking.
- **Room_Status**: The current operational state of a room, one of: Available, Occupied, Reserved_Paid, or Reserved_Unpaid.
- **Seasonal_Rate**: A time-bounded override price per night applied to one or more room types for a defined date range, superseding the base price.
- **Shift_Note**: A time-stamped text entry created by a Receptionist at the end of a shift to communicate pending tasks, guest issues, or important observations to the incoming shift.
- **SMS_Service**: The third-party SMS gateway used by the System to send text messages to Guests' phone numbers.
- **Special_Request**: A free-text note submitted by a Guest during booking to communicate preferences or needs such as early check-in, extra bedding, or dietary requirements.
- **Staff_Account**: A system account belonging to a Receptionist or Manager, with a username, hashed password, role, and active/inactive status.
- **PWA**: Progressive Web Application — a web app delivered via a browser that can be installed on a device's home screen, works offline for cached content, and behaves like a native app without requiring an app store download.
- **Service_Worker**: A browser-managed background script that enables PWA offline caching, background sync, and push notification capabilities.
- **System**: The Ras Hotel management and booking platform as a whole.
- **Audit_Log**: A tamper-evident, append-only record of all significant system actions, capturing the actor (Staff_Account identifier), the action type, the affected entity, and the UTC timestamp.
- **Audit_Log_Entry**: A single record within the Audit_Log representing one discrete action performed by a staff member or the system.
- **Booking_Lifecycle**: The complete set of valid booking statuses and the permitted transitions between them, as defined in Requirement 38.
- **Cash_Collection_Event**: A discrete system record created when a Receptionist confirms that physical cash has been received from a Guest, capturing the amount, the Receptionist's Staff_Account identifier, and the timestamp.
- **Extension_Request**: A Receptionist-initiated action to extend an existing booking's check-out date by one or more additional nights, subject to room availability.
- **Feedback_Link**: A short URL sent to a Guest after check-out that opens a post-stay rating form where the Guest can submit a star rating (1–5) and an optional comment.
- **Hotel_Configuration**: The set of hotel-wide operational parameters managed by the Manager, including hotel name, address, phone number, reception hours, standard check-in time, standard check-out time, no-show threshold time, and cancellation policy window.
- **No_Show_Threshold**: The configurable local time (default 20:00) after which an unchecked-in booking on the current day is automatically escalated as a No_Show candidate.
- **Pre_Arrival_Reminder**: An SMS sent to a Guest approximately 24 hours before their check-in date, containing the Booking_Reference, room type, check-in date, standard check-in time, and hotel address.
- **Receptionist_Dashboard_Home**: The first screen a Receptionist sees upon login, providing an at-a-glance operational snapshot of the current day without requiring navigation to any sub-page.

---

## Requirements

### Requirement 1: AI Chatbot for Guest Support (US-001)

**User Story:** As a Remote Guest, I want to ask questions about the hotel and get instant answers, so that I can make informed decisions without waiting for staff assistance.

#### Acceptance Criteria

1. THE Chatbot SHALL respond to Guest queries using information retrieved from the Document_Store.
2. WHEN a Guest submits a question, THE Chatbot SHALL return a response within 5 seconds under normal network conditions.
3. WHEN the Document_Store contains no relevant information for a query, THE Chatbot SHALL inform the Guest that the answer is unavailable and suggest contacting the hotel directly.
4. THE Chatbot SHALL be accessible 24 hours a day, 7 days a week without requiring Guest authentication.
5. THE Chatbot SHALL support text-based input and output in English, Amharic, and Afaan Oromo.
6. WHEN a Guest session is inactive for 30 minutes, THE Chatbot SHALL reset the conversation context.

---

### Requirement 2: Hotel Document Management for Chatbot Training (US-002)

**User Story:** As a Manager, I want to upload hotel documents and FAQs to the system, so that the Chatbot stays current with accurate hotel information.

#### Acceptance Criteria

1. WHEN a Manager uploads a PDF or text document, THE Document_Store SHALL index the document and make its content available to the Chatbot within 5 minutes.
2. THE System SHALL accept document uploads in PDF and plain text formats with a maximum file size of 20 MB per document.
3. WHEN a Manager uploads a document with the same name as an existing document, THE Document_Store SHALL replace the existing document and re-index the updated content.
4. WHEN a document upload fails, THE System SHALL notify the Manager with a descriptive error message and preserve the previously indexed content.
5. THE Manager SHALL be able to view a list of all uploaded documents including their upload date and indexing status.
6. WHEN a Manager deletes a document, THE Document_Store SHALL remove the document and exclude its content from future Chatbot responses.

---

### Requirement 3: Online Room Booking with Real-Time Availability (US-003)

**User Story:** As a Remote Guest, I want to browse available rooms and make a booking online, so that I can secure my stay before arriving at the hotel.

#### Acceptance Criteria

1. THE Booking_Engine SHALL display a real-time availability calendar showing available and unavailable dates for each room type.
2. WHEN a Guest selects a room and initiates the booking flow, THE Booking_Engine SHALL apply a Room_Lock for 10 minutes to prevent double-booking.
3. WHEN a Room_Lock expires before payment is completed, THE Booking_Engine SHALL release the lock and mark the room as available again.
4. WHEN a Guest completes payment within the Room_Lock period, THE Booking_Engine SHALL confirm the booking and generate a PDF_Ticket.
5. WHEN a Guest initiates the booking flow, THE Booking_Engine SHALL collect the Guest's full name, age, sex, phone number, and nationality as part of the booking form before proceeding to payment.
6. WHEN two Guests attempt to book the same room simultaneously, THE Booking_Engine SHALL confirm the booking for the first Guest to complete payment and notify the second Guest that the room is no longer available.
7. THE Booking_Engine SHALL display room details including room type, price per night, photos, and available amenities before the Guest confirms a booking.
8. THE Booking_Engine SHALL display the hotel's Cancellation_Policy to the Guest on the booking summary page before the Guest proceeds to payment.
9. WHEN a Guest completes the booking flow, THE Booking_Engine SHALL display a booking confirmation screen showing the Booking_Reference, room type, check-in date, check-out date, and total amount paid, so that the Guest has immediate on-screen proof of their confirmed reservation.
10. THE Booking_Engine SHALL present a Special_Request text field during the booking flow, allowing the Guest to submit preferences or needs before confirming the booking.
11. WHEN a Guest submits a Special_Request, THE Booking_Engine SHALL store the request against the booking record and display it to Receptionists on the booking detail view.
12. WHEN the Room_Lock has 2 minutes remaining and payment has not been completed, THE Booking_Engine SHALL display a visible countdown timer warning the Guest that their room hold is about to expire.

---

### Requirement 4: Manual Booking by Receptionist (US-004)

**User Story:** As a Receptionist, I want to create bookings manually for walk-in guests, so that I can register their stay without requiring them to use the online system.

#### Acceptance Criteria

1. WHEN a Receptionist creates a manual booking, THE Booking_Engine SHALL record the Guest's full name, age, sex, phone number, nationality, room number, check-in date, check-out date, and payment method.
2. WHEN a Receptionist submits a manual booking for a room that is already occupied or reserved, THE Booking_Engine SHALL reject the booking and display the conflicting reservation details.
3. THE Booking_Engine SHALL allow the Receptionist to assign a cash payment status of either "Paid" or "Pending" to a manual booking.
4. WHEN a manual booking is saved, THE Booking_Engine SHALL update the room's Room_Status on the Dashboard in real time.
5. THE Booking_Engine SHALL allow the Receptionist to modify or cancel a manual booking before the Guest's check-in date.
6. WHEN a manual booking is created, THE System SHALL generate a PDF_Ticket that the Receptionist can print or share with the Guest.
7. THE Booking_Engine SHALL display the calculated total price for the stay (nightly rate × number of nights) on the manual booking form before the Receptionist saves the booking, so that the Receptionist can communicate the correct amount to the walk-in Guest.
8. WHEN a Receptionist creates a manual booking, THE Booking_Engine SHALL present an optional Special_Request field so that the Receptionist can record any verbal requests made by the walk-in Guest.
9. WHEN a Receptionist saves a manual booking with a "Paid" cash status, THE System SHALL record the Receptionist's Staff_Account identifier and the timestamp of the transaction against the booking record for accountability.

---

### Requirement 5: Payment Processing via Chapa and Cash (US-005)

**User Story:** As a Guest, I want to pay for my booking using TeleBirr, CBE Birr, or cash, so that I can use the payment method most convenient for me.

#### Acceptance Criteria

1. THE Booking_Engine SHALL present TeleBirr, CBE Birr, and Cash as payment options during the checkout flow.
2. WHEN a Guest selects TeleBirr or CBE Birr, THE Chapa_Gateway SHALL initiate the payment transaction and return a transaction reference number to the System.
3. WHEN the Chapa_Gateway confirms a successful payment, THE Booking_Engine SHALL mark the booking as "Paid" and proceed to PDF_Ticket generation.
4. WHEN the Chapa_Gateway returns a payment failure, THE Booking_Engine SHALL notify the Guest with a descriptive error message and allow the Guest to retry or select a different payment method.
5. WHEN a Guest selects Cash payment, THE Booking_Engine SHALL create the booking with a status of "Reserved - Not Paid" and instruct the Guest to pay at the front desk.
6. THE System SHALL store the Chapa_Gateway transaction reference number against the booking record for all mobile money payments.
7. WHEN a payment session expires without completion, THE Booking_Engine SHALL release the Room_Lock and notify the Guest that the booking was not confirmed.

---

### Requirement 6: Mobile Money Transaction Verification by Manager (US-006)

**User Story:** As a Manager, I want to verify mobile money transaction references, so that I can confirm payments that require manual review.

#### Acceptance Criteria

1. THE Dashboard SHALL display all bookings with a "Pending Verification" payment status, including the transaction reference number provided by the Guest or Chapa_Gateway.
2. WHEN a Manager marks a transaction reference as verified, THE System SHALL update the booking status to "Paid" and record the Manager's user ID and verification timestamp.
3. WHEN a Manager marks a transaction reference as rejected, THE System SHALL update the booking status to "Payment Failed" and notify the Guest via the contact information on the booking.
4. THE Dashboard SHALL allow the Manager to search for a booking by transaction reference number.
5. THE System SHALL retain a complete audit log of all payment verification actions including the Manager's user ID, action taken, and timestamp.

---

### Requirement 7: PDF Ticket Generation and Download (US-007)

**User Story:** As a Guest, I want to download a PDF ticket with a QR code after booking, so that I can present it at check-in without delays.

#### Acceptance Criteria

1. WHEN a booking is confirmed with a "Paid" status, THE System SHALL generate a PDF_Ticket containing the Guest's name, Booking_Reference, room type, check-in date, check-out date, and a QR code.
2. THE System SHALL generate the PDF_Ticket with a file size not exceeding 500 KB.
3. THE QR code embedded in the PDF_Ticket SHALL encode the Booking_Reference in a format readable by the QR_Scanner.
4. WHEN a Guest requests a PDF_Ticket download, THE System SHALL make the file available for download within 3 seconds.
5. WHEN a booking is confirmed and the Guest has provided a phone number, THE System SHALL send the PDF_Ticket to the Guest via SMS or a download link accessible through the booking confirmation page.
6. WHEN a PDF_Ticket is regenerated for the same booking, THE System SHALL produce a document with identical booking data and a valid QR code.
7. THE PDF_Ticket SHALL include the hotel's physical address, reception phone number, and a plain-text statement of what the Guest must bring to check-in (a valid government-issued ID and the Booking_Reference), so that the Guest arrives prepared.

---

### Requirement 8: QR Code Scanning for Check-in (US-008)

**User Story:** As a Receptionist, I want to scan a Guest's QR code to instantly retrieve their booking, so that I can complete check-in quickly without manual searching.

#### Acceptance Criteria

1. WHEN a Receptionist scans a valid QR code, THE QR_Scanner SHALL retrieve and display the associated booking details within 2 seconds.
2. WHEN a Receptionist scans a QR code that does not match any booking record, THE QR_Scanner SHALL display an error message indicating the code is invalid or the booking does not exist.
3. WHEN a Receptionist scans a QR code for a booking with a "Reserved - Not Paid" status, THE QR_Scanner SHALL display the booking details and a prominent unpaid payment warning.
4. THE QR_Scanner SHALL be accessible from the Dashboard without requiring a separate application installation.
5. WHEN a Receptionist confirms check-in after scanning, THE Booking_Engine SHALL update the Room_Status to "Occupied" in real time.
6. WHEN a Receptionist confirms check-in, THE System SHALL record the Receptionist's Staff_Account identifier and the check-in timestamp against the booking record.
7. WHEN a booking detail view is open, THE Dashboard SHALL display any Special_Request submitted by the Guest so that the Receptionist can act on it at check-in.

---

### Requirement 9: Hotel Location Map Integration (SS-010)

**User Story:** As a Remote Guest, I want to view the hotel's location on a map with navigation options, so that I can plan my route to the hotel.

#### Acceptance Criteria

1. THE System SHALL display an embedded interactive map showing the hotel's geographic location on the hotel's public-facing website.
2. WHEN a Guest interacts with the map, THE System SHALL provide a link to open the location in Google Maps for turn-by-turn navigation.
3. THE System SHALL display the hotel's address and contact information alongside the map.
4. WHEN the map service is unavailable, THE System SHALL display the hotel's address as plain text in place of the map.

---

### Requirement 10: Real-Time Room Status Dashboard (SS-011)

**User Story:** As a Manager, I want to view a color-coded room status grid, so that I can monitor hotel occupancy and room availability at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display all rooms in a grid layout with each room represented by a color-coded status indicator: Green for Available, Red for Occupied, Yellow for Reserved_Unpaid, and Blue for Reserved_Paid.
2. WHEN a room's Room_Status changes, THE Dashboard SHALL update the corresponding room's color indicator within 5 seconds without requiring a page refresh.
3. WHEN a Manager selects a room on the grid, THE Dashboard SHALL display the room's current booking details including Guest name, check-in date, check-out date, payment status, and any Special_Request.
4. THE Dashboard SHALL display a summary count of rooms in each status category at the top of the grid.
5. THE Dashboard SHALL be accessible only to authenticated Receptionists and Managers.
6. WHEN a Manager filters the grid by Room_Status, THE Dashboard SHALL display only the rooms matching the selected status.

---

### Requirement 11: Staff Authentication and Access Control

**User Story:** As a hotel staff member, I want to log in securely to the system, so that only authorized personnel can access management features.

#### Acceptance Criteria

1. THE System SHALL require Receptionists and Managers to authenticate with a username and password before accessing the Dashboard.
2. WHEN a user enters incorrect credentials three consecutive times, THE System SHALL lock the account for 15 minutes and notify the account holder via the registered staff contact method.
3. THE System SHALL enforce role-based access control, granting Managers access to all features and restricting Receptionists from accessing payment verification, document management, staff account management, room and pricing management, and financial reporting features.
4. WHEN an authenticated session is inactive for 60 minutes, THE System SHALL terminate the session and require the user to log in again.
5. THE System SHALL transmit all authentication credentials over an encrypted HTTPS connection.
6. THE System SHALL allow Guests to browse all public-facing pages — including room listings, the Chatbot, and the hotel map — without requiring any authentication or account creation.

---

### Requirement 12: Progressive Web Application (PWA)

**User Story:** As any user, I want to access the Ras Hotel system from any device through a browser, and optionally install it on my home screen, so that I get a fast, app-like experience without downloading anything from an app store.

#### Acceptance Criteria

1. THE System SHALL be delivered as a PWA, providing a web manifest file that enables installation on Android and iOS home screens directly from the browser.
2. THE System SHALL register a Service_Worker that caches all guest-facing pages — including room listings, the booking form, and the booking confirmation page — for offline or low-connectivity access.
3. WHEN a Guest accesses a cached page without an internet connection, THE System SHALL display the cached content and show a clear notice that the page is being served offline.
4. THE System SHALL render all guest-facing pages correctly on screen widths from 320px to 1920px without horizontal scrolling.
5. THE Booking_Engine SHALL complete the full booking flow — room selection, guest details, payment, and ticket download — on a mobile device without requiring desktop-specific interactions.
6. THE System SHALL achieve a Google Lighthouse PWA audit score of 90 or above and a mobile performance score of 70 or above on all primary guest-facing pages.
7. WHERE a touch interface is detected, THE System SHALL use touch-optimized controls with tap targets of at least 44x44 pixels.
8. THE System SHALL load the initial guest-facing page within 3 seconds on a 3G mobile connection.

---

### Requirement 13: Guest Registration at Booking (US-013)

**User Story:** As a Remote Guest, I want to provide my personal details as part of the booking process, so that the hotel has the information needed to confirm my reservation without requiring me to create an account.

#### Acceptance Criteria

1. WHEN a Guest initiates the booking flow, THE Booking_Engine SHALL present a registration form collecting full name, age, sex, phone number, and nationality before proceeding to payment.
2. THE Booking_Engine SHALL validate that all required registration fields are completed and non-empty before allowing the Guest to advance to the payment step.
3. IF a Guest submits the registration form with a phone number that does not match the expected Ethiopian phone number format, THEN THE Booking_Engine SHALL display a descriptive validation error and prevent form submission.
4. THE System SHALL store the Guest's registration information against the booking record and SHALL NOT create a persistent user account or require the Guest to set a password.
5. WHEN a booking is completed, THE Booking_Engine SHALL associate the booking record with the Guest's phone number as the identity anchor, linking it to any existing bookings that share the same phone number.
6. THE Booking_Engine SHALL allow a Guest to complete a new booking by submitting registration details again without requiring the Guest to reference or authenticate against any previous booking.

---

### Requirement 14: Guest Profile Lookup by Phone Number (US-014)

**User Story:** As a Receptionist or Manager, I want to search for a guest by phone number from the Dashboard, so that I can view their full booking history and registered details across all stays.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a phone number search field that allows Receptionists and Managers to look up a Guest_Profile.
2. WHEN a staff member submits a phone number search, THE Dashboard SHALL retrieve and display the Guest_Profile associated with that phone number within 3 seconds.
3. WHEN a Guest_Profile is displayed, THE Dashboard SHALL show the guest's most recently submitted registration details (full name, age, sex, nationality) and a chronological list of all bookings linked to that phone number.
4. WHEN a staff member searches for a phone number that has no associated bookings, THE Dashboard SHALL display a message indicating that no guest record was found for that number.
5. THE Dashboard SHALL display each booking entry in the Guest_Profile with its booking reference number, room type, check-in date, check-out date, and payment status.
6. THE System SHALL treat the phone number exclusively as an identity anchor for lookup purposes and SHALL NOT use it as a login credential or require the Guest to authenticate.

---

### Requirement 15: Booking Confirmation SMS and Check-In Instructions (US-015)

**User Story:** As a Remote Guest, I want to receive an SMS after my booking is confirmed, so that I know my reservation is real and I know exactly what to do when I arrive.

#### Acceptance Criteria

1. WHEN a booking is confirmed with a "Paid" status, THE SMS_Service SHALL send a confirmation SMS to the Guest's registered phone number within 60 seconds of confirmation.
2. THE confirmation SMS SHALL include the Booking_Reference, the Guest's name, the room type, the check-in date, the check-out date, and a short URL to download the PDF_Ticket.
3. WHEN a booking is confirmed, THE SMS_Service SHALL send a second SMS containing the Check_In_Instructions to the Guest's registered phone number within 60 seconds of confirmation.
4. THE Check_In_Instructions SMS SHALL include the hotel's physical address, the reception phone number, the reception operating hours, and a statement that the Guest must present a valid government-issued ID and their Booking_Reference at check-in.
5. IF the SMS_Service fails to deliver a confirmation SMS after two attempts, THEN THE System SHALL log the failure against the booking record and display a warning on the Dashboard so that a Receptionist can follow up manually.
6. WHEN a booking is created with a "Reserved - Not Paid" (cash) status, THE SMS_Service SHALL send an SMS to the Guest informing them that their room is held and that payment is required at the front desk, including the Booking_Reference and the hotel's address.

---

### Requirement 16: Guest Booking Modification and Cancellation (US-016)

**User Story:** As a Remote Guest, I want to modify or cancel my booking after it is confirmed, so that I can adjust my plans without losing my money unfairly or having to call the hotel.

#### Acceptance Criteria

1. THE System SHALL provide a booking management page accessible to a Guest by entering their Booking_Reference and registered phone number, without requiring a password or account.
2. WHEN a Guest retrieves their booking on the management page, THE System SHALL display the current booking details, the full Cancellation_Policy with refund tiers, and the options to modify dates or cancel the booking.
3. WHEN a Guest requests a date modification, THE Booking_Engine SHALL check availability for the new dates and, if available, update the booking and send an updated confirmation SMS to the Guest.
4. WHEN a Guest requests a date modification that results in a price difference, THE System SHALL display the price difference to the Guest and require explicit confirmation before applying the change.
5. WHEN a Guest cancels a booking more than 48 hours before the check-in date, THE System SHALL update the booking status to "Cancelled - Full Refund", release the room, and flag the booking for a full refund to be processed by the Manager.
6. WHEN a Guest cancels a booking between 1 and 48 hours before the check-in date, THE System SHALL update the booking status to "Cancelled - Partial Refund", release the room, and flag the booking for a 50% refund to be processed by the Manager.
7. WHEN a Guest cancels a booking on the check-in day or after the check-in time has passed, THE System SHALL update the booking status to "Cancelled - No Refund", release the room, and notify the Guest via SMS that no refund is applicable per the Cancellation_Policy.
8. WHEN a booking is flagged for a refund, THE Dashboard SHALL display the booking in a dedicated "Pending Refunds" list visible to the Manager, showing the Guest name, Booking_Reference, cancellation time, refund amount due, and the original payment method.
9. WHEN a Manager processes a refund from the Pending Refunds list, THE System SHALL record the Manager's Staff_Account identifier, the refund amount, and the timestamp against the booking record.
10. WHEN a booking is cancelled for any reason, THE SMS_Service SHALL send a cancellation confirmation SMS to the Guest's registered phone number within 60 seconds, stating the booking reference, the cancellation reason tier, and the refund amount they are entitled to.
11. IF a Guest attempts to modify a booking for a check-in date that has already passed, THEN THE System SHALL reject the modification and display a message directing the Guest to contact the hotel directly.
12. WHEN a booking is modified or cancelled, THE System SHALL record the action, the timestamp, and whether it was initiated by the Guest or a staff member against the booking record.

---

### Requirement 17: Today's Arrivals and Departures View (US-017)

**User Story:** As a Receptionist, I want to see a clear list of all guests arriving and departing today, so that I can prepare for the day without manually scanning through all bookings.

#### Acceptance Criteria

1. THE Dashboard SHALL display a dedicated "Today's Arrivals" list showing all bookings with a check-in date equal to the current date, sorted by booking status (Paid first, then Unpaid).
2. THE Dashboard SHALL display a dedicated "Today's Departures" list showing all bookings with a check-out date equal to the current date, sorted by Room_Status (Occupied first).
3. WHEN a Receptionist selects a booking from the arrivals or departures list, THE Dashboard SHALL display the full booking details including the Guest's name, room number, payment status, and any Special_Request.
4. THE Dashboard SHALL display the count of expected arrivals and expected departures for the current day as summary figures at the top of the view.
5. WHEN a Guest is checked in from the arrivals list, THE Dashboard SHALL move the booking from the arrivals list to an "In-House" section and update the Room_Status to "Occupied" in real time.
6. WHEN a Receptionist processes a check-out from the departures list, THE Dashboard SHALL update the Room_Status to "Available" in real time.
7. THE Dashboard SHALL highlight in a distinct colour any arrival booking that has a "Reserved - Not Paid" status, so that the Receptionist is immediately aware that payment is outstanding.

---

### Requirement 18: Guest Check-Out Process (US-018)

**User Story:** As a Receptionist, I want to formally check out a guest and free their room in the system, so that the room becomes available for the next guest without delay.

#### Acceptance Criteria

1. WHEN a Receptionist initiates check-out for an occupied room, THE Booking_Engine SHALL update the booking status to "Checked Out" and set the Room_Status to "Available".
2. WHEN a check-out is processed, THE System SHALL record the Receptionist's Staff_Account identifier and the exact check-out timestamp against the booking record.
3. WHEN a Receptionist processes a check-out for a booking with outstanding payment, THE Dashboard SHALL display a payment outstanding warning and require the Receptionist to confirm that payment has been collected before completing the check-out.
4. WHEN a check-out is completed, THE Dashboard SHALL update the room's color indicator on the room status grid within 5 seconds without requiring a page refresh.
5. IF a Receptionist attempts to check out a room that is not in "Occupied" status, THEN THE System SHALL reject the action and display the current Room_Status to the Receptionist.
6. WHEN a check-out is completed, THE System SHALL record the total number of nights stayed and the final amount paid against the booking record for reporting purposes.

---

### Requirement 20: Real-Time Notifications and No-Show Management (US-020)

**User Story:** As a Receptionist, I want to receive instant alerts when a new online booking is made, a booking is cancelled, or a guest has not arrived on time, so that I can act immediately — including calling overdue guests to confirm their arrival.

#### Acceptance Criteria

1. WHEN a new online booking is confirmed, THE System SHALL display a Notification_Alert on the Dashboard for all currently logged-in Receptionists and Managers within 10 seconds of confirmation.
2. THE Notification_Alert for a new booking SHALL include the Guest's name, room type, check-in date, and Booking_Reference.
3. WHEN a Guest cancels a booking online, THE System SHALL display a Notification_Alert on the Dashboard for all currently logged-in Receptionists and Managers within 10 seconds of cancellation.
4. THE Dashboard SHALL maintain a notification history log showing all alerts from the past 7 days, accessible to Receptionists and Managers.
5. WHEN a Receptionist acknowledges a Notification_Alert, THE System SHALL mark the alert as read and record the Receptionist's Staff_Account identifier and the acknowledgement timestamp.
6. THE Dashboard SHALL display a dedicated "Overdue Arrivals" list showing all bookings with a check-in date of the current day, a "Paid" or "Reserved" status, and no recorded check-in action, updated in real time.
7. WHEN a booking with a check-in date of the current day has not been checked in by 18:00 local time, THE System SHALL display a Notification_Alert on the Dashboard flagging the booking as overdue, including the Guest's name, phone number, room number, and Booking_Reference, so that the Receptionist can call the Guest directly.
8. THE "Overdue Arrivals" list SHALL display each overdue Guest's registered phone number as a visible, tappable link so that the Receptionist can initiate a call with a single tap on a mobile device.
9. WHEN a Receptionist marks an overdue booking as "No_Show" from the Dashboard, THE Booking_Engine SHALL update the booking status to "No_Show", set the Room_Status to "Available", and record the Receptionist's Staff_Account identifier and the timestamp.
10. WHEN a booking is marked as "No_Show", THE System SHALL flag it in the Manager's revenue summary as a no-show loss for that day.
11. WHEN a booking with a check-in date of the current day has not been checked in by 20:00 local time, THE System SHALL automatically escalate the Notification_Alert to the Manager's Dashboard with an "Action Required" indicator.

---

### Requirement 21: Booking Search and Filtering for Staff (US-021)

**User Story:** As a Receptionist, I want to search and filter bookings by multiple criteria, so that I can quickly find any booking even when a guest arrives without a QR code or booking reference.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a booking search interface that allows Receptionists and Managers to search by Guest name, phone number, Booking_Reference, room number, check-in date, or check-out date.
2. WHEN a staff member submits a search query, THE Dashboard SHALL return matching results within 3 seconds.
3. THE Dashboard SHALL allow staff to filter the booking list by booking status (Paid, Unpaid, Checked In, Checked Out, Cancelled), date range, and room type simultaneously.
4. WHEN a search returns no results, THE Dashboard SHALL display a clear message indicating no bookings match the search criteria and suggest alternative search terms.
5. WHEN a staff member selects a booking from the search results, THE Dashboard SHALL display the full booking detail view including Guest details, payment history, Special_Request, and any Guest_Notes.
6. THE Dashboard SHALL allow partial-name searches so that a Receptionist can find a Guest by entering only a first name or partial phone number.

---

### Requirement 22: Guest Notes (US-022)

**User Story:** As a Receptionist or Manager, I want to add notes to a guest's profile, so that staff across all shifts are aware of important information about that guest.

#### Acceptance Criteria

1. THE Dashboard SHALL allow a Receptionist or Manager to add a Guest_Note to any Guest_Profile.
2. WHEN a Guest_Note is saved, THE System SHALL record the note text, the Staff_Account identifier of the author, and the timestamp.
3. THE Dashboard SHALL display all Guest_Notes for a Guest_Profile in reverse chronological order on the Guest_Profile view.
4. WHEN a Receptionist opens a booking detail view for a Guest who has existing Guest_Notes, THE Dashboard SHALL display a visible indicator that notes exist and show the most recent note.
5. THE Dashboard SHALL allow a Manager to delete any Guest_Note, recording the deletion action and timestamp in the audit log.
6. THE Dashboard SHALL allow the author of a Guest_Note to edit their own note within 24 hours of creation, recording the edit timestamp.

---

### Requirement 23: Shift Handover Log (US-023)

**User Story:** As a Receptionist, I want to write a shift handover note at the end of my shift, so that the incoming receptionist is fully informed about pending tasks and guest issues without me having to call them.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Shift_Note creation interface accessible to all authenticated Receptionists and Managers.
2. WHEN a Receptionist saves a Shift_Note, THE System SHALL record the note text, the Receptionist's Staff_Account identifier, and the timestamp.
3. THE Dashboard SHALL display the three most recent Shift_Notes prominently on the Dashboard home screen so that an incoming Receptionist sees them immediately upon login.
4. THE Dashboard SHALL maintain a searchable archive of all Shift_Notes for the past 90 days, accessible to Receptionists and Managers.
5. WHEN a new Shift_Note is saved, THE System SHALL display a Notification_Alert to all currently logged-in Receptionists and Managers.
6. THE Dashboard SHALL allow a Receptionist to tag a Shift_Note as "Urgent", causing it to be displayed with a distinct visual indicator until a Manager acknowledges it.

---

### Requirement 24: Daily Revenue Summary for Manager (US-024)

**User Story:** As a Manager, I want to see a daily revenue summary showing how much cash and mobile money was collected, so that I can verify collections and hold staff accountable.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Revenue_Summary for the current day on the Manager's home screen, showing total cash collected, total mobile money collected, total number of bookings, and the day's Occupancy_Rate.
2. WHEN a Manager selects a specific date, THE Dashboard SHALL display the Revenue_Summary for that date within 3 seconds.
3. THE Revenue_Summary SHALL itemise each cash payment by Booking_Reference, Guest name, amount, and the Staff_Account identifier of the Receptionist who recorded the payment.
4. THE Revenue_Summary SHALL itemise each mobile money payment by Booking_Reference, Guest name, amount, and the Chapa_Gateway transaction reference number.
5. WHEN the total cash recorded in the System for a given day differs from the expected total by more than 0 ETB, THE Dashboard SHALL display a discrepancy warning on the Revenue_Summary for that day.
6. THE Dashboard SHALL allow a Manager to export the Revenue_Summary for any date range as a CSV file.
7. WHEN a Manager views the Revenue_Summary, THE Dashboard SHALL display a breakdown of revenue by room type for the selected period.

---

### Requirement 25: Occupancy Reports and Analytics (US-025)

**User Story:** As a Manager, I want to view occupancy trends and booking analytics over time, so that I can make informed decisions about staffing, pricing, and promotions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an analytics view showing the daily Occupancy_Rate for any selected date range as a line chart.
2. THE Dashboard SHALL display the total number of bookings, total revenue, average length of stay, and average Occupancy_Rate for any selected date range.
3. THE Dashboard SHALL display a breakdown of bookings by room type for any selected date range, showing count and revenue per room type.
4. THE Dashboard SHALL display a breakdown of bookings by payment method (cash vs. TeleBirr vs. CBE Birr) for any selected date range.
5. THE Dashboard SHALL display the top 5 busiest dates by Occupancy_Rate within any selected date range.
6. WHEN a Manager selects a date range longer than 90 days, THE Dashboard SHALL generate the analytics report within 10 seconds.
7. THE Dashboard SHALL allow a Manager to export the analytics report for any date range as a CSV file.
8. THE Dashboard SHALL display the number of cancellations and the cancellation rate for any selected date range.

---

### Requirement 26: Room and Pricing Management (US-026)

**User Story:** As a Manager, I want to add, edit, and deactivate rooms and set seasonal pricing, so that the system always reflects the hotel's actual inventory and current rates.

#### Acceptance Criteria

1. THE Dashboard SHALL allow a Manager to create a new Room record with a room number, room type, floor, description, base price per night, and up to 10 photos.
2. WHEN a Manager saves a new Room, THE Booking_Engine SHALL make the room available in the online booking flow and the manual booking form immediately.
3. THE Dashboard SHALL allow a Manager to edit any Room's description, base price, and photos at any time.
4. WHEN a Manager deactivates a Room, THE Booking_Engine SHALL prevent the room from appearing in the online booking flow and the manual booking form, while preserving all historical booking records for that room.
5. THE Dashboard SHALL allow a Manager to create a Seasonal_Rate by specifying a room type, a start date, an end date, and an override price per night.
6. WHEN a Seasonal_Rate is active for a room type, THE Booking_Engine SHALL display the Seasonal_Rate price instead of the base price to Guests during the booking flow for dates within the Seasonal_Rate period.
7. WHEN two Seasonal_Rates overlap for the same room type, THE System SHALL reject the second Seasonal_Rate and display a conflict error to the Manager showing the dates of the existing rate.
8. THE Dashboard SHALL display a calendar view of all active and upcoming Seasonal_Rates so that the Manager can see pricing at a glance across the year.
9. WHEN a Manager deletes a Seasonal_Rate, THE Booking_Engine SHALL revert to the base price for the affected room type and date range immediately.

---

### Requirement 27: Staff Account Management (US-027)

**User Story:** As a Manager, I want to create, edit, and deactivate staff accounts, so that only current employees have access to the system and I can control what each person can do.

#### Acceptance Criteria

1. THE Dashboard SHALL allow a Manager to create a new Staff_Account by specifying a full name, username, role (Receptionist or Manager), and a temporary password.
2. WHEN a new Staff_Account is created, THE System SHALL require the staff member to change the temporary password on their first login.
3. THE Dashboard SHALL allow a Manager to change the role of any Staff_Account between Receptionist and Manager.
4. WHEN a Manager deactivates a Staff_Account, THE System SHALL immediately terminate any active session for that account and prevent future logins.
5. THE Dashboard SHALL display a list of all Staff_Accounts with their name, username, role, account status (active/inactive), and the date of their last login.
6. THE Dashboard SHALL allow a Manager to reset the password of any Staff_Account, generating a new temporary password and requiring the staff member to change it on next login.
7. THE System SHALL prevent a Manager from deactivating their own account, ensuring at least one active Manager account always exists.
8. WHEN a Staff_Account is created, modified, or deactivated, THE System SHALL record the action, the Manager's Staff_Account identifier, and the timestamp in the audit log.

---

### Requirement 28: Overbooking Prevention and Handling (US-028)

**User Story:** As a Manager, I want the system to prevent overbooking and alert me when a conflict risk arises, so that no two guests are ever assigned the same room for overlapping dates.

#### Acceptance Criteria

1. WHEN any booking is created or modified, THE Booking_Engine SHALL verify that no other confirmed booking exists for the same room on any overlapping date before saving.
2. IF a booking creation or modification would result in an overlapping reservation for the same room, THEN THE Booking_Engine SHALL reject the action and display the conflicting booking's reference number, Guest name, and dates to the staff member.
3. WHEN a room is deactivated by the Manager, THE Booking_Engine SHALL check for existing future bookings for that room and display a warning listing all affected bookings so that the Manager can take action.
4. THE Dashboard SHALL display a dedicated overbooking risk indicator if any room has two or more confirmed bookings with overlapping dates, allowing the Manager to resolve the conflict.
5. WHEN the Booking_Engine detects an overbooking conflict during a system integrity check, THE System SHALL create a Notification_Alert for all logged-in Managers with the details of the conflicting bookings.

---

### Requirement 29: Multilingual Guest-Facing Interface (US-029)

**User Story:** As a Remote Guest who is more comfortable in Amharic or Afaan Oromo, I want to use the booking system in my preferred language, so that I can complete my reservation without language barriers.

#### Acceptance Criteria

1. THE System SHALL provide the complete guest-facing booking flow — including room listings, the booking form, the payment page, and the booking confirmation page — in English, Amharic, and Afaan Oromo.
2. WHEN a Guest selects a language, THE System SHALL apply that language to all guest-facing pages for the duration of the session.
3. THE System SHALL default to English and display a clearly visible language selector on the first page a Guest visits.
4. WHEN the System sends an SMS to a Guest, THE SMS_Service SHALL send the message in the language the Guest selected during the booking flow.
5. THE PDF_Ticket SHALL be generated in the language the Guest selected during the booking flow.
6. WHERE a translation for a specific term is unavailable, THE System SHALL fall back to the English term and log the missing translation for the Manager's review.

---

### Requirement 30: Booking Lookup by Reference for Guests (US-030)

**User Story:** As a Remote Guest, I want to look up my booking using my reference number and phone number, so that I can verify my reservation is confirmed and retrieve my PDF ticket at any time.

#### Acceptance Criteria

1. THE System SHALL provide a public booking lookup page where a Guest can enter their Booking_Reference and registered phone number to retrieve their booking.
2. WHEN a Guest submits a valid Booking_Reference and matching phone number, THE System SHALL display the booking details including room type, check-in date, check-out date, payment status, and a link to download the PDF_Ticket.
3. WHEN a Guest submits a Booking_Reference that does not exist or a phone number that does not match the booking record, THE System SHALL display a clear error message without revealing whether the reference or the phone number was incorrect.
4. WHEN a Guest retrieves a confirmed booking via the lookup page, THE System SHALL display the Check_In_Instructions alongside the booking details.
5. THE booking lookup page SHALL be accessible without authentication and SHALL be linked from the booking confirmation page and the SMS confirmation message.
6. WHEN a Guest retrieves a booking with a "Reserved - Not Paid" status, THE System SHALL display the outstanding payment amount and the hotel's contact details so the Guest knows how to complete payment.

---

### Requirement 31: Walk-in Cash Collection Recording (US-031)

**User Story:** As a Receptionist, I want to formally record in the system that I have physically collected cash from a walk-in guest, so that the Manager can see exactly who collected what amount and when, and the booking status reflects the real payment state.

#### Acceptance Criteria

1. WHEN a booking has a payment status of "Reserved - Not Paid" and the Guest is present at the front desk, THE Dashboard SHALL display a "Record Cash Payment" action on the booking detail view, accessible only to authenticated Receptionists.
2. WHEN a Receptionist selects "Record Cash Payment", THE System SHALL require the Receptionist to enter the amount received and confirm the action before saving.
3. WHEN a Receptionist confirms a Cash_Collection_Event, THE Booking_Engine SHALL update the booking status from "Reserved - Not Paid" to "Paid" and record the Cash_Collection_Event against the booking, including the Receptionist's Staff_Account identifier, the amount collected, and the UTC timestamp.
4. WHEN a Cash_Collection_Event is recorded, THE Dashboard SHALL update the booking's payment status indicator in real time without requiring a page refresh.
5. WHEN a Cash_Collection_Event is recorded, THE System SHALL add an Audit_Log_Entry capturing the Receptionist's Staff_Account identifier, the booking reference, the amount, and the timestamp.
6. WHEN a Cash_Collection_Event is recorded, THE Revenue_Summary for that day SHALL include the payment itemised under the Receptionist's Staff_Account identifier so that the Manager can reconcile cash by staff member.
7. IF a Receptionist attempts to record a Cash_Collection_Event for a booking that already has a "Paid" status, THEN THE System SHALL reject the action and display the existing payment record to prevent duplicate entries.

---

### Requirement 32: Pre-Arrival Reminder SMS (US-032)

**User Story:** As a Remote Guest, I want to receive an SMS reminder the day before my check-in, so that I do not forget my reservation and I arrive with the correct information.

#### Acceptance Criteria

1. WHEN a booking has a "Paid" status and the check-in date is the following calendar day, THE SMS_Service SHALL send a Pre_Arrival_Reminder to the Guest's registered phone number between 09:00 and 11:00 local time.
2. THE Pre_Arrival_Reminder SHALL include the Guest's name, the Booking_Reference, the room type, the check-in date, the standard check-in time as configured in the Hotel_Configuration, and the hotel's address.
3. THE Pre_Arrival_Reminder SHALL include a short URL to the booking lookup page so that the Guest can retrieve their PDF_Ticket if needed.
4. WHEN the SMS_Service fails to deliver the Pre_Arrival_Reminder after two attempts, THE System SHALL log the failure against the booking record and display a warning on the Dashboard so that a Receptionist can follow up manually.
5. WHEN a booking's check-in date is modified to a new date, THE System SHALL reschedule the Pre_Arrival_Reminder for the day before the new check-in date and cancel any previously scheduled reminder for the old date.
6. WHEN a booking is cancelled before the Pre_Arrival_Reminder is sent, THE System SHALL cancel the scheduled reminder and SHALL NOT send it.
7. WHERE the Guest selected a language other than English during the booking flow, THE SMS_Service SHALL send the Pre_Arrival_Reminder in that language.

---

### Requirement 33: Receptionist Dashboard Home Screen (US-033)

**User Story:** As a Receptionist, I want to see a complete operational snapshot the moment I log in, so that I can immediately understand the state of the hotel and act on urgent items without navigating to multiple screens.

#### Acceptance Criteria

1. WHEN a Receptionist successfully authenticates, THE Dashboard SHALL display the Receptionist_Dashboard_Home as the first screen without requiring any additional navigation.
2. THE Receptionist_Dashboard_Home SHALL display the following figures for the current day, each updated in real time: total expected arrivals, total expected departures, number of rooms currently available, number of bookings with outstanding payment, and number of overdue arrivals (guests not yet checked in past 18:00 local time).
3. THE Receptionist_Dashboard_Home SHALL display the three most recent Shift_Notes as defined in Requirement 23, so that the incoming Receptionist is immediately informed of handover items.
4. THE Receptionist_Dashboard_Home SHALL display a count of unread Notification_Alerts with a visible badge, and selecting the badge SHALL navigate the Receptionist to the full notification history.
5. WHEN any figure on the Receptionist_Dashboard_Home changes (new booking, check-in, check-out, payment recorded), THE Dashboard SHALL update the affected figure within 5 seconds without requiring a page refresh.
6. THE Receptionist_Dashboard_Home SHALL provide one-tap quick-action buttons for: "New Manual Booking", "Scan QR Code", and "Today's Arrivals", so that the Receptionist can reach the most common workflows in a single interaction.
7. WHEN there are overdue arrivals on the Receptionist_Dashboard_Home, THE Dashboard SHALL display the overdue arrivals count in a distinct warning colour to draw immediate attention.

---

### Requirement 34: Manager Hotel Configuration (US-034)

**User Story:** As a Manager, I want to configure hotel-wide operational parameters from the Dashboard, so that the system reflects the hotel's actual policies and contact details without requiring developer intervention.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Hotel_Configuration settings page accessible only to authenticated Managers.
2. THE Hotel_Configuration page SHALL allow the Manager to set and save the following parameters: hotel name, hotel address, hotel reception phone number, reception operating hours, standard check-in time, standard check-out time, No_Show_Threshold, and cancellation policy window (in hours).
3. WHEN a Manager saves a Hotel_Configuration change, THE System SHALL apply the updated values to all subsequent SMS messages, PDF_Tickets, and system logic (such as no-show escalation and cancellation refund calculations) immediately.
4. WHEN a Manager saves a Hotel_Configuration change, THE System SHALL add an Audit_Log_Entry recording the Manager's Staff_Account identifier, the parameter changed, the previous value, the new value, and the timestamp.
5. THE System SHALL use the No_Show_Threshold from the Hotel_Configuration when determining when to escalate overdue arrivals as defined in Requirement 20, replacing any previously hardcoded value.
6. THE System SHALL use the cancellation policy window from the Hotel_Configuration when calculating refund tiers as defined in Requirement 16, replacing any previously hardcoded 48-hour value.
7. IF a Manager attempts to set the standard check-out time to a value later than or equal to the standard check-in time on the same day, THEN THE System SHALL display a validation error and reject the change.
8. THE Hotel_Configuration page SHALL display the current value of each parameter alongside its input field so that the Manager can see what is currently active before making changes.

---

### Requirement 35: Post-Stay Guest Feedback (US-035)

**User Story:** As a Guest, I want to rate my stay and leave a comment after I check out, so that the hotel can improve its service and I feel that my experience is valued.

#### Acceptance Criteria

1. WHEN a check-out is completed, THE SMS_Service SHALL send a feedback SMS to the Guest's registered phone number within 60 minutes of check-out, containing a Feedback_Link and a brief message thanking the Guest for their stay.
2. THE Feedback_Link SHALL open a lightweight, mobile-optimised form where the Guest can select a star rating from 1 to 5 and optionally enter a free-text comment of up to 500 characters.
3. THE Feedback_Link SHALL remain active for 7 days after check-out, after which the form SHALL display a message informing the Guest that the feedback window has closed.
4. WHEN a Guest submits a rating, THE System SHALL store the rating, the optional comment, the Booking_Reference, and the submission timestamp against the booking record.
5. THE Dashboard SHALL provide a feedback summary view accessible to Managers, displaying all submitted ratings with the Guest name, Booking_Reference, check-out date, star rating, and comment.
6. THE Dashboard SHALL display the hotel's average star rating for any selected date range, calculated from all submitted feedback within that period.
7. WHEN a Guest submits a rating of 1 or 2 stars, THE System SHALL display a Notification_Alert on the Manager's Dashboard flagging the low rating with the Guest's name, Booking_Reference, and comment, so that the Manager can follow up.
8. THE Feedback_Link form SHALL be accessible without authentication and SHALL NOT require the Guest to create an account or enter any personal details beyond what is pre-populated from the booking record.

---

### Requirement 36: Booking Extension by Receptionist (US-036)

**User Story:** As a Receptionist, I want to extend a guest's check-out date while they are in-house, so that a guest who wants to stay additional nights can do so without creating a new booking.

#### Acceptance Criteria

1. WHEN a booking has a status of "Checked In" (room is Occupied), THE Dashboard SHALL display an "Extend Stay" action on the booking detail view, accessible to authenticated Receptionists.
2. WHEN a Receptionist initiates an Extension_Request, THE Booking_Engine SHALL check availability for the same room for each additional night requested and display the result to the Receptionist before any change is saved.
3. IF any of the requested additional nights are unavailable for the same room, THEN THE Booking_Engine SHALL reject the Extension_Request and display which specific dates are blocked and by which conflicting booking.
4. WHEN the Booking_Engine confirms availability for all requested additional nights, THE Dashboard SHALL display the updated total price for the extended stay (original amount plus additional nights at the applicable nightly rate, including any active Seasonal_Rate) and require the Receptionist to confirm before saving.
5. WHEN a Receptionist confirms an Extension_Request, THE Booking_Engine SHALL update the booking's check-out date, recalculate the total amount, and record the Extension_Request with the Receptionist's Staff_Account identifier, the original check-out date, the new check-out date, and the timestamp.
6. WHEN an Extension_Request is confirmed, THE System SHALL add an Audit_Log_Entry capturing the Receptionist's Staff_Account identifier, the Booking_Reference, the original check-out date, the new check-out date, and the additional amount due.
7. WHEN an Extension_Request is confirmed, THE Dashboard SHALL update the booking's check-out date on the room status grid and the Today's Departures list in real time.
8. WHEN additional payment is collected for an Extension_Request, THE Receptionist SHALL record it as a Cash_Collection_Event as defined in Requirement 31, linking it to the same Booking_Reference.

---

### Requirement 37: Unified System Audit Log for Manager (US-037)

**User Story:** As a Manager, I want to view a single, searchable audit log of all system actions performed by staff, so that I can investigate discrepancies, verify accountability, and review any action taken on any booking or account.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a dedicated Audit_Log view accessible only to authenticated Managers.
2. THE Audit_Log view SHALL display all Audit_Log_Entries in reverse chronological order, with each entry showing: the UTC timestamp, the Staff_Account identifier of the actor, the action type, the affected entity type (e.g., Booking, Staff_Account, Room, Hotel_Configuration), the affected entity identifier, and a plain-language description of the action.
3. THE Audit_Log view SHALL allow the Manager to filter entries by: Staff_Account (by name or username), action type, affected entity type, and date range.
4. WHEN a Manager applies filters, THE Dashboard SHALL return matching Audit_Log_Entries within 5 seconds.
5. THE Audit_Log SHALL capture entries for at minimum the following action types: booking creation, booking modification, booking cancellation, check-in, check-out, Cash_Collection_Event, payment verification, Extension_Request, No_Show marking, Staff_Account creation, Staff_Account modification, Staff_Account deactivation, password reset, Guest_Note creation, Guest_Note deletion, document upload, document deletion, Room creation, Room modification, Room deactivation, Seasonal_Rate creation, Seasonal_Rate deletion, and Hotel_Configuration change.
6. THE Audit_Log SHALL be append-only: no Receptionist or Manager SHALL be able to edit or delete any Audit_Log_Entry through the Dashboard.
7. THE Dashboard SHALL allow a Manager to export the Audit_Log for any date range as a CSV file, including all fields defined in criterion 2.
8. THE Audit_Log SHALL retain all entries for a minimum of 365 days from the date of the action.

---

### Requirement 38: Booking Status Lifecycle (US-038)

**User Story:** As a system operator, I want the system to enforce a formally defined booking status lifecycle, so that invalid status transitions are prevented and every booking's history is unambiguous and auditable.

#### Acceptance Criteria

1. THE Booking_Engine SHALL recognise exactly the following booking statuses: Reserved_Unpaid, Paid, Checked_In, Checked_Out, Cancelled_Full_Refund, Cancelled_Partial_Refund, Cancelled_No_Refund, and No_Show.
2. THE Booking_Engine SHALL enforce the following permitted status transitions and SHALL reject any transition not listed here:
   - Reserved_Unpaid → Paid (cash collected at front desk via Cash_Collection_Event or online payment confirmed)
   - Reserved_Unpaid → Cancelled_No_Refund (cancelled before payment was made)
   - Paid → Checked_In (Receptionist confirms check-in)
   - Paid → Cancelled_Full_Refund (cancelled more than the configured cancellation policy window before check-in)
   - Paid → Cancelled_Partial_Refund (cancelled within the configured cancellation policy window)
   - Paid → Cancelled_No_Refund (cancelled on check-in day)
   - Paid → No_Show (not checked in by No_Show_Threshold on check-in day)
   - Checked_In → Checked_Out (Receptionist confirms check-out)
3. WHEN a staff member or the system attempts a status transition that is not in the permitted list defined in criterion 2, THE Booking_Engine SHALL reject the action, display the current status and the list of valid next statuses to the actor, and add an Audit_Log_Entry recording the rejected attempt.
4. WHEN a booking transitions to any status, THE System SHALL record the new status, the previous status, the actor (Staff_Account identifier or "System" for automated transitions), and the UTC timestamp as an Audit_Log_Entry.
5. THE Dashboard SHALL display the full status history of any booking — showing each status, the actor who triggered the transition, and the timestamp — on the booking detail view, accessible to Receptionists and Managers.
6. WHEN a booking reaches a terminal status (Checked_Out, Cancelled_Full_Refund, Cancelled_Partial_Refund, Cancelled_No_Refund, or No_Show), THE Booking_Engine SHALL prevent any further status transitions for that booking.
7. THE Booking_Engine SHALL validate booking status consistency during any system integrity check: IF a room has Room_Status "Occupied" but no associated booking in "Checked_In" status, THEN THE System SHALL create a Notification_Alert for all logged-in Managers identifying the inconsistent room.
