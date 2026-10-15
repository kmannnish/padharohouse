/**
 * Padharo House — booking confirmation email
 *
 * Deploy at script.google.com WHILE SIGNED IN AS padharohouse@gmail.com
 * (MailApp sends from whichever account owns the script).
 *
 *   1. script.google.com -> New project -> paste this file
 *   2. Deploy -> New deployment -> type "Web app"
 *        Execute as:        Me (padharohouse@gmail.com)
 *        Who has access:    Anyone
 *   3. Authorise when prompted, copy the /exec URL
 *   4. Paste that URL into booking.html as SCRIPT_URL
 */
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var host = 'padharohouse@gmail.com';
  var map = 'https://www.google.com/maps/search/?api=1&query=26.987683983961603,75.8550010443521';
  var rows = [
    ['Booking reference', d.bookingId], ['Guest', d.guestName], ['Phone', d.phone],
    ['Check-in', d.checkIn + ' (from 2 PM)'], ['Check-out', d.checkOut + ' (by 11 AM)'],
    ['Nights', d.nights], ['Guests', d.guests], ['Experiences', d.packageTitle || 'Stay only'],
    ['Total', '₹' + d.totalAmount], ['Advance received', '₹' + d.advanceClaimed],
    ['Balance at check-in', '₹' + d.balanceDue], ['UPI reference', d.utr]
  ].map(function (r) {
    return '<tr><td style="padding:9px 14px;color:#6E645A;border-bottom:1px solid #f1e9dd;font-size:14px">' + r[0] +
           '</td><td style="padding:9px 14px;font-weight:600;border-bottom:1px solid #f1e9dd;font-size:14px">' + r[1] + '</td></tr>';
  }).join('');
  var html = '<div style="font-family:Georgia,serif;max-width:620px;margin:auto;background:#FBF6EE;padding:30px;border:1px solid #e8dcc9">' +
    '<h1 style="color:#A0472A;font-size:26px;margin:0">Padharo House</h1>' +
    '<p style="color:#C0923B;letter-spacing:.2em;font-size:10px;margin:4px 0 20px">WHERE HERITAGE MEETS HOSPITALITY</p>' +
    '<p style="color:#2B2620;font-size:15px;line-height:1.6">Khamma Ghani ' + d.guestName + ',<br>' +
    'Your <b>exclusive suite</b> opposite the Amer Fort is held. We are verifying your payment and will confirm on WhatsApp shortly.</p>' +
    '<table style="width:100%;border-collapse:collapse;background:#fff;margin:20px 0">' + rows + '</table>' +
    '<h3 style="color:#A0472A;margin:22px 0 6px;font-size:17px">Finding us</h3>' +
    '<p style="color:#2B2620;font-size:14px;line-height:1.6">Padharo House is hardly a <b>50 metre walk</b> from the Amer Fort, in Amer, Jaipur. ' +
    'Ask your driver for the lane directly opposite the fort entrance, then call <b>+91 94618 84005</b> — we will walk out to meet you.</p>' +
    '<p style="margin:18px 0"><a href="' + map + '" style="background:#A0472A;color:#fff;padding:12px 22px;text-decoration:none;border-radius:999px;font-size:14px">Open the Google Maps pin</a></p>' +
    '<p style="color:#6E645A;font-size:12px;border-top:1px solid #e8dcc9;padding-top:14px">The entire house is yours — no other guests. ' +
    'Questions? Just reply to this email or message us on WhatsApp.</p></div>';
  if (d.email) MailApp.sendEmail({ to: d.email, subject: 'Padharo House — booking ' + d.bookingId + ' received', htmlBody: html, name: 'Padharo House' });
  MailApp.sendEmail({ to: host, subject: 'NEW BOOKING ' + d.bookingId + ' — ' + d.guestName + ' (verify UTR ' + d.utr + ')', htmlBody: html, name: 'Padharo House' });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
