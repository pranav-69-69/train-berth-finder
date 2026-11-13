/* Train Berth Finder — core logic (works in browser AND in Node for tests).
   Berth/seat layouts VERIFIED from multiple independent sources (Nov 2026).
   No DOM access at import time. */
(function (root) {
  'use strict';

/* ------------------------------------------------------------------ */
  /* Train Berth Position Decoder — berth/seat layouts VERIFIED from   */
  /* multiple independent sources (Nov 2026):                          */
  /*  - SL / 3A: bay of 8, pattern LB,MB,UB,LB,MB,UB,SL,SU repeats.    */
  /*    n mod 8: 1 LB, 2 MB, 3 UB, 4 LB, 5 MB, 6 UB, 7 SL, 0 SU.        */
  /*    Sources: yehsafarhamarahai.com berth guide (mod-8 table),      */
  /*    railmitra.com 3A guide (full berth-number lists to 72),        */
  /*    trainticketdatecalculator.in seat finder, sambalpur.co.in       */
  /*    coach-layout table (numbers 1-80). SL: ICF 72, LHB 80 berths;  */
  /*    3A: ICF 64, LHB 72 — same mod-8 pattern.                       */
  /*  - 2A: bay of 6, pattern LB,UB,LB,UB,SL,SU repeats (no MB).       */
  /*    Sources: trainticketdatecalculator.in (mod-6, SL at 5,11,17..),*/
  /*    sambalpur.co.in table. ICF 46, LHB 54 berths.                  */
  /*  - 3E / Garib Rath: bay of 9, LB,MB,UB,LB,MB,UB,SL,SM,SU.         */
  /*    Sources: trainticketdatecalculator.in, lastberth.com,          */
  /*    sambalpur.co.in (SL 7, SM 8, SU 9 / 16,17,18). 83 berths.      */
  /*  - CC (AC Chair Car, standard ICF Shatabdi layout): first row 4   */
  /*    seats (W,A,A,W), then rows of 5 (W,M,A,A,W) — 3+2 layout.      */
  /*    Sources: sambalpur.co.in + scribd "Train Coach Seating         */
  /*    Arrangements" agree on the exact seat sequence (1 W, 2 A,      */
  /*    3 A, 4 W, 5 W, 6 M, 7 A, 8 A, 9 W, 10 W, 11 M ...);            */
  /*    railmitra.com + railtravels.org confirm 3+2, 5 seats/row,      */
  /*    73-78 seats. NOTE: Vande Bharat end coaches (44 seats) and    */
  /*    Jan Shatabdi (3+3) use different layouts — flagged on page.    */
  /*  - EC (Executive Chair Car, Shatabdi): 2+2, W,A,A,W per row of 4.  */
  /*    Sources: scribd layout table (W A A W repeating), railmitra    */
  /*    Vande Bharat guide (2x2, no middle seat). 56 seats Shatabdi,   */
  /*    52 Vande Bharat — flagged on page.                             */
  /*  - 2S (Second Sitting): 3+3, W,M,A,A,M,W per row of 6. Sources:   */
  /*    trainticketdatecalculator.in, sambalpur.co.in. 108 seats.       */
  /*  - 1A (First AC): NOT covered — cabins/coupes, no fixed repeating */
  /*    pattern (trainticketdatecalculator.in confirms). Tool shows    */
  /*    "not covered yet" with the reason, never a guessed mapping.    */
  /*  Window/aisle side for sleepers: main-bay berths (LB/MB/UB) are   */
  /*  against the window wall; side berths (SL/SM/SU) run along the    */
  /*  aisle/corridor.                                                   */
  /* ------------------------------------------------------------------ */

  var BERTH_TYPE_INFO = {
    LB: { en: 'Lower Berth', hi: 'लोअर बर्थ', sub: 'Neeche wali — sabse aaram, din mein baithne ki seat bhi', side: 'window' },
    MB: { en: 'Middle Berth', hi: 'मिडिल बर्थ', sub: 'Beech wali — sirf raat 10 baje ke baad khulti hai', side: 'window' },
    UB: { en: 'Upper Berth', hi: 'अपर बर्थ', sub: 'Upar wali — sabse shant, chadhna padta hai', side: 'window' },
    SL: { en: 'Side Lower', hi: 'साइड लोअर', sub: 'Galiyare ki neeche wali — din mein 2 log baith sakte hain', side: 'aisle' },
    SM: { en: 'Side Middle', hi: 'साइड मिडिल', sub: 'Galiyare ki beech wali — sirf 3E / Garib Rath mein', side: 'aisle' },
    SU: { en: 'Side Upper', hi: 'साइड अपर', sub: 'Galiyare ki upar wali — privacy achhi, chadhna padta hai', side: 'aisle' },
    W: { en: 'Window Seat', hi: 'खिड़की वाली सीट', sub: 'Bahar ka view — safar ka maza', side: 'window' },
    M: { en: 'Middle Seat', hi: 'बीच वाली सीट', sub: 'Na window, na aisle — beech mein', side: 'middle' },
    A: { en: 'Aisle Seat', hi: 'गलियारे वाली सीट', sub: 'Uthna-baithna sabse aasan', side: 'aisle' }
  };

  var BERTH_COACHES = [
    { id: 'sl', code: 'SL', nameEn: 'Sleeper Class', nameHi: 'स्लीपर क्लास', total: 80, kind: 'sleeper', baySize: 8, sideCount: 2, pattern: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'], noteEn: 'ICF coach: 72 berths. LHB coach: 80 berths. Same pattern.', noteHi: 'ICF coach mein 72 berths, LHB mein 80 — pattern same hai.' },
    { id: '3a', code: '3A', nameEn: 'AC 3 Tier', nameHi: 'एसी 3 टियर', total: 72, kind: 'sleeper', baySize: 8, sideCount: 2, pattern: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'], noteEn: 'ICF coach: 64 berths. LHB coach: 72 berths. Same pattern.', noteHi: 'ICF coach mein 64 berths, LHB mein 72 — pattern same hai.' },
    { id: '2a', code: '2A', nameEn: 'AC 2 Tier', nameHi: 'एसी 2 टियर', total: 54, kind: 'sleeper', baySize: 6, sideCount: 2, pattern: ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'], noteEn: 'No middle berth in 2A. ICF: 46 berths. LHB: 54 berths.', noteHi: '2A mein middle berth nahi hota. ICF mein 46, LHB mein 54 berths.' },
    { id: '3e', code: '3E', nameEn: 'AC 3 Tier Economy', nameHi: 'एसी 3 टियर इकोनॉमी', total: 83, kind: 'sleeper', baySize: 9, sideCount: 3, pattern: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SM', 'SU'], noteEn: 'Garib Rath coaches use the same 9-berth bay pattern.', noteHi: 'Garib Rath coach mein bhi yahi pattern hai.' },
    { id: 'cc', code: 'CC', nameEn: 'AC Chair Car', nameHi: 'एसी चेयर कार', total: 78, kind: 'chair', rowSize: 5, firstRow: 4, pattern: ['W', 'M', 'A', 'A', 'W'], noteEn: 'Standard Shatabdi / ICF layout (3+2). Vande Bharat end coaches (44 seats) and Jan Shatabdi (3+3) differ — check your ticket.', noteHi: 'Standard Shatabdi / ICF layout (3+2). Vande Bharat ke end coaches (44 seats) aur Jan Shatabdi (3+3) mein layout alag hai — ticket par check karein.' },
    { id: 'ec', code: 'EC', nameEn: 'Executive Chair Car', nameHi: 'एग्ज़ीक्यूटिव चेयर कार', total: 56, kind: 'chair', rowSize: 4, pattern: ['W', 'A', 'A', 'W'], noteEn: 'Shatabdi layout (2+2, no middle seat). Vande Bharat / Tejas: 52 seats, layout may differ — check your ticket.', noteHi: 'Shatabdi layout (2+2, beech wali seat nahi). Vande Bharat / Tejas mein 52 seats, layout alag ho sakta hai — ticket par check karein.' },
    { id: '2s', code: '2S', nameEn: 'Second Sitting', nameHi: 'सेकंड सिटिंग', total: 108, kind: 'chair', rowSize: 6, pattern: ['W', 'M', 'A', 'A', 'M', 'W'], noteEn: '3+3 seating, 6 seats per row.', noteHi: '3+3 seating, har row mein 6 seats.' },
    { id: '1a', code: '1A', nameEn: 'First AC', nameHi: 'फर्स्ट एसी', total: 24, kind: 'sleeper', covered: false, noteEn: 'Cabins and coupes — no fixed repeating pattern. Seat number alone cannot tell the berth. Check the IRCTC coach layout for your train.', noteHi: 'Cabins aur coupe hote hain — koi fixed pattern nahi. Sirf seat number se berth pata nahi chalti. Apni train ka IRCTC coach layout dekhein.' }
  ];

  function berthCoachById(id) {
    for (var i = 0; i < BERTH_COACHES.length; i++) if (BERTH_COACHES[i].id === id) return BERTH_COACHES[i];
    return BERTH_COACHES[0];
  }

  function decodeBerth(coachId, seatRaw) {
    var coach = berthCoachById(coachId);
    var seat = parseInt(String(seatRaw).trim(), 10);
    if (coach.covered === false) {
      return { ok: false, covered: false, coach: coach, seat: seat, errorEn: 'First AC (1A) is not covered yet — cabins and coupes have no fixed pattern.', errorHi: 'First AC (1A) abhi covered nahi hai — cabins aur coupe ka koi fixed pattern nahi hota.' };
    }
    if (isNaN(seat) || String(seatRaw).trim() === '') {
      return { ok: false, coach: coach, seat: seat, errorEn: 'Please type your berth / seat number.', errorHi: 'Apna berth / seat number likho.' };
    }
    if (seat < 1 || seat > coach.total) {
      return { ok: false, coach: coach, seat: seat, errorEn: 'This coach has only berths 1 to ' + coach.total + '. Please check your ticket number.', errorHi: 'Is coach mein sirf 1 se ' + coach.total + ' tak berths hain. Apna number dobara check karo.' };
    }
    var code, group, groupSeats = [];
    if (coach.kind === 'sleeper') {
      var idx = (seat - 1) % coach.baySize;
      code = coach.pattern[idx];
      var bay = Math.floor((seat - 1) / coach.baySize) + 1;
      var bayStart = (bay - 1) * coach.baySize + 1;
      var bayEnd = Math.min(bay * coach.baySize, coach.total);
      group = { kind: 'bay', no: bay, start: bayStart, end: bayEnd, total: Math.ceil(coach.total / coach.baySize) };
      for (var n = bayStart; n <= bayEnd; n++) {
        groupSeats.push({ n: n, code: coach.pattern[(n - 1) % coach.baySize] });
      }
    } else {
      var row, rowStart, rowEnd;
      if (coach.firstRow) {
        if (seat <= coach.firstRow) {
          code = ['W', 'A', 'A', 'W'][seat - 1];
          row = 1; rowStart = 1; rowEnd = coach.firstRow;
        } else {
          var off = seat - coach.firstRow - 1;
          code = coach.pattern[off % coach.rowSize];
          row = 2 + Math.floor(off / coach.rowSize);
          rowStart = coach.firstRow + 1 + (row - 2) * coach.rowSize;
          rowEnd = Math.min(rowStart + coach.rowSize - 1, coach.total);
        }
      } else {
        code = coach.pattern[(seat - 1) % coach.rowSize];
        row = Math.floor((seat - 1) / coach.rowSize) + 1;
        rowStart = (row - 1) * coach.rowSize + 1;
        rowEnd = Math.min(row * coach.rowSize, coach.total);
      }
      group = { kind: 'row', no: row, start: rowStart, end: rowEnd, total: Math.ceil((coach.total - (coach.firstRow || 0)) / coach.rowSize) + (coach.firstRow ? 1 : 0) };
      for (var m = rowStart; m <= rowEnd; m++) {
        var c2;
        if (coach.firstRow && m <= coach.firstRow) c2 = ['W', 'A', 'A', 'W'][m - 1];
        else if (coach.firstRow) c2 = coach.pattern[(m - coach.firstRow - 1) % coach.rowSize];
        else c2 = coach.pattern[(m - 1) % coach.rowSize];
        groupSeats.push({ n: m, code: c2 });
      }
    }
    var info = BERTH_TYPE_INFO[code];
    var sideLabel = info.side === 'window' ? { en: 'Window side', hi: 'खिड़की की तरफ' }
      : info.side === 'aisle' ? { en: 'Aisle side', hi: 'गलियारे की तरफ' }
      : { en: 'Middle seat', hi: 'बीच वाली सीट' };
    return { ok: true, coach: coach, seat: seat, code: code, typeEn: info.en, typeHi: info.hi, tip: info.sub, side: info.side, sideEn: sideLabel.en, sideHi: sideLabel.hi, group: group, groupSeats: groupSeats };
  }

  var api = {
    decodeBerth: decodeBerth,
    berthCoachById: berthCoachById,
    BERTH_COACHES: BERTH_COACHES,
    BERTH_TYPE_INFO: BERTH_TYPE_INFO
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CreatorTools = api;
})(typeof window !== 'undefined' ? window : globalThis);
