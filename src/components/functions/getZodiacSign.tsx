/**
 * Returns a zodiac sign (e.g., "Aries") based on birth month and day.
 *
 * @param {string|number} birthMonth - Month as a name ("March") or number (3)
 * @param {number|string} birthDay   - Day of the month (1-31)
 * @returns {string|null} The zodiac sign or null if invalid input
 */
export function getZodiacSign(birthMonth, birthDay) {
    // Map of month names to their numeric values
    const monthNames = {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12
    };
  
    // Convert string month (e.g., "March") to number (3)
    const month = typeof birthMonth === "string"
      ? monthNames[birthMonth]
      : birthMonth;
  
    // Convert day to a number
    const day = parseInt(birthDay, 10);
  
    // Validate input
    if (!month || isNaN(day)) {
      return null;
    }
  
    // List of zodiac signs with start/end [month, day]
    const zodiacSigns = [
      { sign: "Capricorn",  start: [12, 22], end: [1, 19] },
      { sign: "Aquarius",   start: [1, 20],  end: [2, 18] },
      { sign: "Pisces",     start: [2, 19],  end: [3, 20] },
      { sign: "Aries",      start: [3, 21],  end: [4, 19] },
      { sign: "Taurus",     start: [4, 20],  end: [5, 20] },
      { sign: "Gemini",     start: [5, 21],  end: [6, 21] },
      { sign: "Cancer",     start: [6, 22],  end: [7, 22] },
      { sign: "Leo",        start: [7, 23],  end: [8, 22] },
      { sign: "Virgo",      start: [8, 23],  end: [9, 22] },
      { sign: "Libra",      start: [9, 23],  end: [10, 23] },
      { sign: "Scorpio",    start: [10, 24], end: [11, 21] },
      { sign: "Sagittarius", start: [11, 22], end: [12, 21] }
    ];
  
    // Find which zodiacSign range the given month/day falls into
    for (let i = 0; i < zodiacSigns.length; i++) {
      const { sign, start, end } = zodiacSigns[i];
  
      // Check if birth date is between start & end
      if (
        (month === start[0] && day >= start[1]) ||
        (month === end[0] && day <= end[1])
      ) {
        return sign;
      }
    }
  
    // If none matched (shouldn't happen with valid data)
    return null;
  }
  