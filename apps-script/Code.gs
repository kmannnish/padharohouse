/**
 * Padharo House — booking & enquiry emails
 *
 * Deploy at script.google.com WHILE SIGNED IN AS padharohouse@gmail.com
 * (MailApp sends from whichever Google account owns this script).
 *
 *   1. script.google.com -> New project -> paste this whole file -> Save
 *   2. Deploy -> New deployment -> gear icon -> Web app
 *        Description:     Padharo House mailer
 *        Execute as:      Me (padharohouse@gmail.com)
 *        Who has access:  Anyone                  <-- required, the website is anonymous
 *   3. Authorise access when prompted (choose Advanced -> Go to ... if warned)
 *   4. Copy the Web app URL ending in /exec
 *   5. Paste it in the admin console: Site & Brand -> Email webhook -> Save
 *
 * Receives { type: "BOOKING" | "ENQUIRY", ... } as text/plain JSON.
 */
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var host = d.hostEmail || 'padharohouse@gmail.com';
  var map = d.mapLink || 'https://www.google.com/maps/search/?api=1&query=26.987683983961603,75.8550010443521';
  var isBooking = d.type !== 'ENQUIRY';

  var rows = isBooking ? [
    ['Booking reference', d.bookingId], ['Guest', d.guestName], ['Phone', d.phone],
    ['Check-in', d.checkIn + (d.checkInTime ? ' (from ' + d.checkInTime + ')' : '')],
    ['Check-out', d.checkOut + (d.checkOutTime ? ' (by ' + d.checkOutTime + ')' : '')],
    ['Nights', d.nights], ['Guests', d.guests], ['Experiences', d.packageTitle || 'Stay only'],
    ['Paid via', (d.paymentMethod || '').replace('_', ' ') + (d.paymentOption === 'FULL' ? ' · full payment' : ' · 30% advance')],
    ['Payment reference', d.paymentRef || d.utr || '—'],
    ['Total', '₹' + d.totalAmount], ['Received', '₹' + d.advanceClaimed],
    ['Balance at check-in', '₹' + d.balanceDue]
  ] : [
    ['Name', d.guestName], ['Phone', d.phone], ['Email', d.email || '—'],
    ['Preferred dates', d.dates || 'flexible'], ['Message', d.message || '—']
  ];

  var table = rows.map(function (r) {
    return '<tr><td style="padding:9px 14px;color:#6E645A;border-bottom:1px solid #f1e9dd;font-size:14px">' + r[0] +
           '</td><td style="padding:9px 14px;font-weight:600;border-bottom:1px solid #f1e9dd;font-size:14px">' + r[1] + '</td></tr>';
  }).join('');

  var lead = isBooking
    ? 'Your <b>exclusive suite</b> opposite the Amer Fort is held. We are verifying your payment and will confirm on WhatsApp shortly.'
    : 'Thank you for your enquiry — we have it, and one of us will reply personally very soon.';

  var html = '<div style="font-family:Georgia,serif;max-width:620px;margin:auto;background:#FBF6EE;padding:30px;border:1px solid #e8dcc9">' +
    '<h1 style="color:#A0472A;font-size:26px;margin:0">Padharo House</h1>' +
    '<p style="color:#C0923B;letter-spacing:.2em;font-size:10px;margin:4px 0 20px">WHERE HERITAGE MEETS HOSPITALITY</p>' +
    '<p style="color:#2B2620;font-size:15px;line-height:1.6">Khamma Ghani ' + d.guestName + ',<br>' + lead + '</p>' +
    '<table style="width:100%;border-collapse:collapse;background:#fff;margin:20px 0">' + table + '</table>' +
    '<h3 style="color:#A0472A;margin:22px 0 6px;font-size:17px">Finding us</h3>' +
    '<p style="color:#2B2620;font-size:14px;line-height:1.6">Padharo House is hardly a <b>50 metre walk</b> from the Amer Fort, in Amer, Jaipur. ' +
    'Ask your driver for the lane directly opposite the fort entrance, then call <b>' + (d.hostPhone || '+91 94618 84005') +
    '</b> — we will walk out to meet you.</p>' +
    '<p style="margin:18px 0"><a href="' + map + '" style="background:#A0472A;color:#fff;padding:12px 22px;text-decoration:none;border-radius:999px;font-size:14px">Open the Google Maps pin</a></p>' +
    '<p style="color:#6E645A;font-size:12px;border-top:1px solid #e8dcc9;padding-top:14px">The entire house is yours — no other guests. ' +
    'Just reply to this email or message us on WhatsApp with any question.</p></div>';

  var guestSubject = isBooking ? 'Padharo House — booking ' + d.bookingId + ' received'
                               : 'Padharo House — we have your enquiry';
  var hostSubject = isBooking
    ? 'NEW BOOKING ' + d.bookingId + ' — ' + d.guestName + ' (verify ' + (d.paymentRef || d.utr) + ')'
    : 'New enquiry — ' + d.guestName + ' (' + d.phone + ')';

  if (d.email) MailApp.sendEmail({ to: d.email, subject: guestSubject, htmlBody: html, name: 'Padharo House' });
  MailApp.sendEmail({ to: host, subject: hostSubject, htmlBody: html, name: 'Padharo House' });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
